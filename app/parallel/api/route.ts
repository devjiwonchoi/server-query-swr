import type { NextRequest } from 'next/server'

// Simple GET route handler. Sleeps for `duration` ms, then echoes `n` plus the
// server-side start timestamp. Reading searchParams marks this dynamic, so with
// cacheComponents it runs at request time (no prerender, no response cache).
export async function GET(request: NextRequest) {
  const n = Number(request.nextUrl.searchParams.get('n'))
  const duration = Number(request.nextUrl.searchParams.get('duration'))

  const start = Date.now()
  console.log(`[route]  start #${n} @ ${new Date(start).toISOString().slice(11, 23)}`)
  await new Promise((resolve) => setTimeout(resolve, duration))

  // `start` lets the client measure how parallel the server-side starts were,
  // independent of browser transport (connection cap) and total wall time.
  return Response.json({ n, start })
}
