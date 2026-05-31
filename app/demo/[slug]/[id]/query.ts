import { cacheLife } from 'next/cache'

export type Item = {
  slug: string
  id: string
  cachedAt: string
}

export type ItemParams = { slug: string; id: string }

// ~15s window so a cache hit is easy to see: revalidating within it returns the
// same cachedAt, and it refreshes after.
const CACHE_WINDOW = { stale: 15, revalidate: 15, expire: 60 }

// The cached unit, keyed by plain (slug, id) args. Keying on the resolved values
// (not the `{ params }` wrapper) means the server prefetch and the client
// revalidation share one cache entry, so within the window they return the same
// cachedAt (a hit) and a fresh one after. `cachedAt` is stamped at compute time.
async function getCachedItem(slug: string, id: string): Promise<Item> {
  'use cache'
  cacheLife(CACHE_WINDOW)
  return { slug, id, cachedAt: new Date().toISOString() }
}

// The loader for the queryServer pattern. It is a server reference (carries
// `$$id`), so `queryServer` can read its id on the server and SWR can re-invoke
// it on the client to revalidate. `params` may arrive as the page's promise on
// the server or a resolved object from `useParams()` on the client, so we
// `await` it defensively before reading the cache.
export async function getItem({
  params,
}: {
  params: ItemParams | Promise<ItemParams>
}): Promise<Item> {
  'use server'
  const { slug, id } = await params
  return getCachedItem(slug, id)
}
