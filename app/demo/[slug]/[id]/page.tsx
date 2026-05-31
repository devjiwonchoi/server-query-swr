import { queryServer } from '@/app/server-queries/query-server'
import { getItem } from './query'
import type { Item, ItemParams } from './query'
import { Demo } from './client'

// The server half of the pattern: build a ServerQuery from the loader + the
// route params. queryServer reads the loader's server-reference id (server-only)
// and kicks off the fetch, then we hand the whole query to the client hook.
export default async function Page({
  params,
}: {
  params: Promise<ItemParams>
}) {
  const query = queryServer<Item, ItemParams>({ loader: getItem, params })
  return <Demo query={query} />
}
