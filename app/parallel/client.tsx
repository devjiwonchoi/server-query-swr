'use client'

import { useState } from 'react'
import { echo } from './actions'

type Echo = { n: number; start: number }
// clientMs: end-to-end wall time the user feels (includes browser transport).
// spreadMs: max(server start) - min(server start). ~0 => the server started
// them in parallel; ~(N-1)*duration => the server started them one at a time.
// n/duration are stored so the label reflects the run, not later input edits.
type Result = {
  clientMs: number
  spreadMs: number
  n: number
  duration: number
} | null

function spread(results: Echo[]) {
  const starts = results.map((r) => r.start)
  return Math.max(...starts) - Math.min(...starts)
}

// Classify the server-start spread relative to a fully-serial baseline
// ((n-1)*duration). Distinguishes true parallel from connection-cap waves from
// real serialization, which a single `spread < duration` check cannot.
function classify({ spreadMs, n, duration }: NonNullable<Result>) {
  if (n <= 1 || duration <= 0) return ''
  const fullSerial = (n - 1) * duration
  if (spreadMs <= Math.max(duration * 0.5, 50)) return 'parallel'
  if (spreadMs >= fullSerial * 0.8) return 'serial'
  return `${Math.round(spreadMs / duration) + 1} waves`
}

export function Client() {
  // Default 5 is below the browser's ~6 HTTP/1.1 connections-per-origin cap, so
  // the route-handler number reflects true parallelism rather than connection
  // queueing. Raise it above ~6 to see the cap kick in (see note below).
  const [invocations, setInvocations] = useState(5)
  const [duration, setDuration] = useState(1000)
  const [running, setRunning] = useState(false)
  const [route, setRoute] = useState<Result>(null)
  const [action, setAction] = useState<Result>(null)
  const [actionSeq, setActionSeq] = useState<Result>(null)

  async function run(e: React.FormEvent) {
    e.preventDefault()
    setRunning(true)
    setRoute(null)
    setAction(null)
    setActionSeq(null)

    const payloads = Array.from({ length: invocations }, (_, i) => ({
      n: i + 1,
      duration,
    }))

    // 1) Route handlers: N parallel GET requests via Promise.all.
    let start = Date.now()
    let results: Echo[] = await Promise.all(
      payloads.map(({ n, duration }) =>
        fetch(`/parallel/api?n=${n}&duration=${duration}`).then((res) =>
          res.json(),
        ),
      ),
    )
    setRoute({
      clientMs: Date.now() - start,
      spreadMs: spread(results),
      n: invocations,
      duration,
    })

    // 2) Server actions via Promise.all: parallel only with
    //    experimental.parallelServerFunctions (a server-functions Next build);
    //    one-at-a-time on plain canary like this project.
    start = Date.now()
    results = await Promise.all(payloads.map((payload) => echo(payload)))
    setAction({
      clientMs: Date.now() - start,
      spreadMs: spread(results),
      n: invocations,
      duration,
    })

    // 3) Server actions awaited one-by-one: sequential by construction,
    //    independent of any flag. This is how you opt out of parallelism when
    //    calls depend on each other (each waits for the previous to resolve).
    start = Date.now()
    const seq: Echo[] = []
    for (const payload of payloads) {
      seq.push(await echo(payload))
    }
    setActionSeq({
      clientMs: Date.now() - start,
      spreadMs: spread(seq),
      n: invocations,
      duration,
    })

    setRunning(false)
  }

  const cell = (r: Result) => (r ? `${r.clientMs} ms` : running ? '…' : '-')
  const spreadCell = (r: Result) =>
    r ? `${r.spreadMs} ms (${classify(r)})` : running ? '…' : '-'

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8 font-mono text-sm">
      <header className="space-y-1">
        <h1 className="text-lg font-bold">
          Route handler vs. server action (parallel dispatch)
        </h1>
        <p className="text-gray-500">
          N invocations, each doing the same <code>setTimeout(duration)</code> on
          the server, fired three ways: route handlers and server actions via{' '}
          <code>Promise.all</code>, plus server actions <code>await</code>ed
          one-by-one.
        </p>
      </header>

      <form onSubmit={run} className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          Invocations
          <input
            type="number"
            min={1}
            value={invocations}
            disabled={running}
            onChange={(e) => setInvocations(Number(e.target.value))}
            className="w-28 rounded border px-2 py-1"
            data-testid="invocations"
          />
        </label>
        <label className="flex flex-col gap-1">
          Duration (ms)
          <input
            type="number"
            min={0}
            value={duration}
            disabled={running}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-28 rounded border px-2 py-1"
            data-testid="duration"
          />
        </label>
        <button
          type="submit"
          disabled={running}
          className="rounded bg-black px-4 py-1.5 text-white disabled:opacity-50"
          data-testid="run"
        >
          {running ? 'Running…' : 'Run'}
        </button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Approach</th>
            <th className="py-2">End-to-end</th>
            <th className="py-2">
              Server-start spread{' '}
              <span className="font-normal text-gray-400">(parallel ≈ 0)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2">Route handlers (Promise.all)</td>
            <td className="py-2" data-testid="route-ms">
              {cell(route)}
            </td>
            <td className="py-2" data-testid="route-spread">
              {spreadCell(route)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2">Server actions (Promise.all)</td>
            <td className="py-2" data-testid="action-ms">
              {cell(action)}
            </td>
            <td className="py-2" data-testid="action-spread">
              {spreadCell(action)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2">Server actions (awaited one-by-one)</td>
            <td className="py-2" data-testid="actionseq-ms">
              {cell(actionSeq)}
            </td>
            <td className="py-2" data-testid="actionseq-spread">
              {spreadCell(actionSeq)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-2 text-xs text-gray-500">
        <p>
          The <em>server-start spread</em> column is the clean signal,
          independent of transport: ~0 means the server started them in parallel,
          ~(N−1)×duration means one at a time. On plain canary (this project)
          route handlers run in parallel while both server-action paths are
          serial. The experimental <code>parallelServerFunctions</code> flag (on a
          server-functions Next build, see the sibling{' '}
          <code>server-action-vs-route</code> repro) makes the Promise.all action
          row parallel, matching route handlers, while the one-by-one row stays
          serial.
        </p>
        <p>
          <strong>Browser connection cap.</strong> Over HTTP/1.1 (what{' '}
          <code>next start</code> serves on localhost) browsers cap ~6 concurrent
          connections per origin, so the route row shows waves above ~6
          invocations. One-at-a-time server actions never reach the cap (only one
          is ever in flight). Run a production build (
          <code>pnpm build &amp;&amp; pnpm start</code>) for meaningful numbers.
        </p>
      </div>
    </main>
  )
}
