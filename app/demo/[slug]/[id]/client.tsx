'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useServerQuerySWR } from '@/app/server-queries/use-server-swr'
import type { ServerQuery } from '@/app/server-queries/query-server'
import type { Item, ItemParams } from './query'

// A link that actually looks like a link. (No usePathname for an active marker:
// reading the pathname in the prerendered shell would opt the route out of
// partial prerendering. The card below already shows the current slug/id.)
function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
    >
      {children}
    </Link>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.85em] text-gray-800">
      {children}
    </code>
  )
}

// The client half of the pattern. Two things this showcases:
//
//  1. No fetch from the client on initial render. The first paint comes from the
//     server prefetch (query.initialData), mapped to the SWR key as a fallback.
//     We wrap the loader to count *client* calls; the server prefetch does not
//     go through it, so the counter stays 0 until you press revalidate (and even
//     navigating between routes streams fresh data over RSC, not a client fetch).
//
//  2. The cache changes. The loader is a `'use cache'` function with a ~15s
//     cacheLife. Each revalidate makes a client request (counter +1), but the
//     server returns the cached value within the window (cachedAt unchanged) and
//     a fresh one after it.
function Detail({ query }: { query: ServerQuery<Item, ItemParams> }) {
  const [clientFetches, setClientFetches] = useState(0)
  const [lastResult, setLastResult] = useState<'hit' | 'fresh' | null>(null)

  const countingQuery = useMemo<ServerQuery<Item, ItemParams>>(
    () => ({
      ...query,
      loader: (args) => {
        setClientFetches((c) => c + 1)
        return query.loader(args)
      },
    }),
    [query],
  )

  // Disable automatic revalidation so the only client requests are the explicit
  // revalidate button: the first paint comes purely from the server prefetch.
  const { data, mutate, isValidating } = useServerQuerySWR<Item, ItemParams>(
    countingQuery,
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
    },
  )

  async function revalidate() {
    const before = data.cachedAt
    const next = await mutate()
    setLastResult(next && next.cachedAt === before ? 'hit' : 'fresh')
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
      <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2">
        <dt className="text-gray-500">slug</dt>
        <dd>{data.slug}</dd>
        <dt className="text-gray-500">id</dt>
        <dd>{data.id}</dd>
        <dt className="text-gray-500">cachedAt</dt>
        <dd data-testid="cachedAt" className="tabular-nums">
          {data.cachedAt}
        </dd>
        <dt className="text-gray-500">client requests</dt>
        <dd className="flex items-center gap-2">
          <span data-testid="client-fetches" className="font-bold tabular-nums">
            {clientFetches}
          </span>
          {clientFetches === 0 && (
            <span className="text-gray-400">no client fetch on first paint</span>
          )}
        </dd>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={revalidate}
          disabled={isValidating}
          data-testid="revalidate"
          className="rounded-md bg-black px-4 py-1.5 font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {isValidating ? 'revalidating…' : 'revalidate'}
        </button>
        {lastResult === 'hit' && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
            cache hit: cachedAt unchanged
          </span>
        )}
        {lastResult === 'fresh' && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700">
            refreshed: cache miss
          </span>
        )}
      </div>
    </div>
  )
}

export function Demo({ query }: { query: ServerQuery<Item, ItemParams> }) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8 font-mono text-sm">
      <header className="space-y-2">
        <h1 className="text-xl font-bold">useServerQuerySWR demo</h1>
        <p className="leading-relaxed text-gray-500">
          The SWR key is the loader&apos;s <Code>$$id</Code> fused with the route
          params, so switching routes is a separate cache entry. First paint comes
          from the server (no client request: the counter stays 0). Revalidate
          makes a client request every time, but <Code>cachedAt</Code> stays the
          same within the ~15s cache window (a hit) and refreshes after it (a
          miss).
        </p>
      </header>

      <Suspense fallback={<div className="text-gray-400">loading…</div>}>
        <Detail query={query} />
      </Suspense>

      <section className="space-y-2">
        <h2 className="text-gray-500">Switch route (changes the key)</h2>
        <ul className="space-y-1.5">
          <li>
            <NavLink href="/demo/acme/1">/demo/acme/1</NavLink>
          </li>
          <li>
            <NavLink href="/demo/acme/2">/demo/acme/2</NavLink>{' '}
            <span className="text-gray-400">same slug, diff id</span>
          </li>
          <li>
            <NavLink href="/demo/beta/1">/demo/beta/1</NavLink>{' '}
            <span className="text-gray-400">diff slug, same id</span>
          </li>
        </ul>
      </section>

      <nav className="flex flex-wrap gap-4 border-t border-gray-200 pt-4">
        <NavLink href="/revalidate">/revalidate</NavLink>
        <NavLink href="/parallel">/parallel</NavLink>
      </nav>
    </main>
  )
}
