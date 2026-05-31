# server-query-swr

`useServerQuerySWR`: a tiny SWR hook that fetches data from a **server-function
loader**, keyed by the loader's React server-reference id (`$$id`) plus route
params, so the cache key is stable without hand-writing key strings. The utils
live in `app/server-queries/` (the `queryServer` pattern, lifted from the
`vercel-api` package):

- `server-reference-id.ts` reads a server function's `$$id` (server-only).
- `query-server.ts` (`queryServer`) wraps a loader into `{ id, initialData, loader }`.
- `use-server-swr.ts` (`useServerQuerySWR`) subscribes via SWR, keyed by `[id, params]`.

Three routes exercise it.

## `/demo/[slug]/[id]`: cache + no client fetch on initial render

The pattern end to end. `page.tsx` (a Server Component) calls
`queryServer({ loader: getItem, params })` and passes the `ServerQuery` to the
client, which calls `useServerQuerySWR(query)`. Two things it shows, both visible
on screen:

- **No fetch from the client on initial render.** The loader is wrapped to count
  client calls; the first paint comes from the server prefetch
  (`query.initialData`), so the counter is **0** on load and only climbs when you
  press revalidate. (Auto-revalidation is turned off so the button is the only
  client request; otherwise SWR revalidates once on mount.)
- **The cache changes.** The cached unit is a `'use cache'` function keyed by
  plain `(slug, id)` with a ~15s `cacheLife`. Revalidating within the window
  returns the **same** `cachedAt` (a hit: the counter climbs while `cachedAt`
  does not), and a fresh one after it.

Switching `/demo/acme/1` to `/demo/acme/2` or `/demo/beta/1` changes the route
params, so the key changes (a separate cache entry), and navigating streams the
new data over RSC without a client fetch either.

## `/revalidate`: 10 queries, revalidate-all timing

10 distinct `useServerQuerySWR` usages (10 distinct loaders, so the keys do not
dedupe) on one page, with a **Revalidate all** button. Each query's elapsed time
is measured from the single click, so serial dispatch shows as a staircase. The
per-query slowness is adjustable.

Because the loaders are server functions, Next dispatches them one at a time, so
the times climb and the total is ~N x slowness rather than one slowness:

| Slowness | q1 | q2 | q5 | q10 | total |
| --- | --- | --- | --- | --- | --- |
| 150 ms | ~160 ms | ~316 ms | ~782 ms | ~1568 ms | ~1568 ms |
| 300 ms | ~308 ms | ~613 ms | ~1530 ms | ~3057 ms | ~3057 ms |

## `/parallel`: route handler vs server action

The dispatch contrast, as a bench. N invocations, each a `setTimeout(duration)`
on the server, fired three ways: route handlers via `Promise.all`, server actions
via `Promise.all`, and server actions awaited one-by-one. It reports end-to-end
time and **server-start spread** (`max(start) - min(start)`; ~0 = parallel,
~(N-1)x duration = one at a time, which isolates dispatch from transport).

Verified (prod build, 5 x 400 ms, plain canary):

| Approach | End-to-end | Server-start spread |
| --- | --- | --- |
| Route handlers (`Promise.all`) | ~422 ms | ~6 ms (parallel) |
| Server actions (`Promise.all`) | ~2030 ms | ~1624 ms (serial) |
| Server actions (one-by-one) | ~2027 ms | ~1620 ms (serial) |

Route handlers run in parallel; server actions are dispatched one at a time. From
the Next docs (`.../07-mutating-data.md`): "Server Functions ... the client
currently dispatches and awaits them one at a time. ... If you need parallel data
fetching, use ... a Route Handler." The experimental
`experimental.parallelServerFunctions` flag (on a server-functions Next build,
see the sibling `server-action-vs-route` repro) makes the `Promise.all` action
row parallel while the one-by-one row stays serial; this project runs plain
canary, so it shows the default.

## Run

```sh
pnpm install
pnpm build && pnpm start   # production build; dev mode adds compile overhead
# open http://localhost:3000
```

Over HTTP/1.1 (what `next start` serves on localhost) browsers cap ~6 concurrent
connections per origin, so the `/parallel` route row shows waves above ~6
invocations; HTTP/2 removes it. One-at-a-time server functions never reach the
cap (only one is ever in flight).
