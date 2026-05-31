'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyedMutator } from 'swr'
import { useServerQuerySWR } from '@/app/server-queries/use-server-swr'
import type { ServerQuery } from '@/app/server-queries/query-server'
import type { RevalidateData, RevalidateParams } from './types'

// One of the 10 useServerQuerySWR usages. It paints from the server prefetch and
// does not fetch on mount; it registers its `mutate` so the parent can revalidate
// all 10 at once. The adjustable `duration` is injected into the loader call (the
// key stays [id, route params], so changing duration alone does not refetch).
function Probe({
  query,
  duration,
  time,
  register,
}: {
  query: ServerQuery<RevalidateData, RevalidateParams>
  duration: number
  time: number | undefined
  register: (n: number, mutate: KeyedMutator<RevalidateData>) => void
}) {
  const wrapped = useMemo<ServerQuery<RevalidateData, RevalidateParams>>(
    () => ({ ...query, loader: () => query.loader({ params: { duration } }) }),
    [query, duration],
  )

  const { data, mutate } = useServerQuerySWR<RevalidateData, RevalidateParams>(
    wrapped,
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
    },
  )

  const registered = useRef(false)
  useEffect(() => {
    if (registered.current) return
    registered.current = true
    register(data.n, mutate)
  }, [register, data.n, mutate])

  return (
    <div
      className="flex items-center justify-between border-b py-1.5"
      data-testid={`probe-${data.n}`}
    >
      <span>query #{data.n}</span>
      <span data-testid={`time-${data.n}`}>
        {time === undefined ? (
          <span className="text-gray-400">-</span>
        ) : (
          <span>{time} ms</span>
        )}
      </span>
    </div>
  )
}

export function Revalidate({
  queries,
}: {
  queries: ServerQuery<RevalidateData, RevalidateParams>[]
}) {
  const [duration, setDuration] = useState(300)
  const [running, setRunning] = useState(false)
  const [times, setTimes] = useState<Record<number, number>>({})
  const [total, setTotal] = useState<number | null>(null)

  const mutators = useRef(new Map<number, KeyedMutator<RevalidateData>>())
  const register = useCallback(
    (n: number, mutate: KeyedMutator<RevalidateData>) => {
      mutators.current.set(n, mutate)
    },
    [],
  )

  async function revalidateAll(e: React.FormEvent) {
    e.preventDefault()
    setRunning(true)
    setTimes({})
    setTotal(null)

    const ns = queries.map((_, i) => i + 1)
    const t0 = Date.now()
    // Fire all 10 revalidations at once. Each calls a server function, so the
    // client dispatches them one at a time: each query's elapsed time is from
    // the same t0, so they climb (~k × duration) and the total is ~N × duration.
    await Promise.all(
      ns.map((n) => {
        const m = mutators.current.get(n)
        if (!m) return Promise.resolve()
        return m().then(() => {
          setTimes((prev) => ({ ...prev, [n]: Date.now() - t0 }))
        })
      }),
    )
    setTotal(Date.now() - t0)
    setRunning(false)
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8 font-mono text-sm">
      <header className="space-y-1">
        <h1 className="text-lg font-bold">
          useServerQuerySWR × {queries.length}: revalidate from the client
        </h1>
        <p className="text-gray-500">
          {queries.length} distinct queries (distinct loaders) on one page. Run
          revalidates them all at once. Each calls a server function, and Next
          dispatches server functions one at a time, so the per-query times climb
          (~k × slowness) and the total is ~{queries.length} × slowness rather
          than one slowness. Raise the slowness to make it obvious.
        </p>
      </header>

      <form onSubmit={revalidateAll} className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          Slowness per query (ms)
          <input
            type="number"
            min={0}
            step={50}
            value={duration}
            disabled={running}
            onChange={(e) => setDuration(Math.max(0, Number(e.target.value)))}
            className="w-32 rounded border px-2 py-1"
            data-testid="duration"
          />
        </label>
        <button
          type="submit"
          disabled={running}
          className="rounded bg-black px-4 py-1.5 text-white disabled:opacity-50"
          data-testid="revalidate-all"
        >
          {running ? 'Revalidating…' : 'Revalidate all'}
        </button>
        <div className="ml-auto self-center">
          total:{' '}
          <code data-testid="total">
            {total === null ? (running ? '…' : '-') : `${total} ms`}
          </code>
        </div>
      </form>

      <Suspense
        fallback={<div className="text-gray-400">prefetching queries…</div>}
      >
        <div>
          {queries.map((query, i) => (
            <Probe
              key={i}
              query={query}
              duration={duration}
              time={times[i + 1]}
              register={register}
            />
          ))}
        </div>
      </Suspense>

      <p className="text-xs text-gray-500">
        The per-query time is measured from the single Run click to that query
        resolving, so serial dispatch shows as a staircase. Run a production
        build (<code>pnpm build &amp;&amp; pnpm start</code>) for meaningful
        numbers. See <code>/parallel</code> for the route-handler contrast.
      </p>
    </main>
  )
}
