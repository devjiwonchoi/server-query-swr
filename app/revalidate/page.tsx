import { Suspense } from 'react'
import { connection } from 'next/server'
import { queryServer } from '@/app/server-queries/query-server'
import { q1, q2, q3, q4, q5, q6, q7, q8, q9, q10 } from './loaders'
import type { RevalidateData, RevalidateParams } from './types'
import { Revalidate } from './client'

const LOADERS = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10]

// Build one ServerQuery per loader with the real `queryServer` (reads each
// loader's $$id and kicks off the prefetch). This runs at request time (the
// loaders stamp `Date.now()`), so it lives inside a Suspense boundary: the page
// shell prerenders and this streams in.
async function Probes() {
  await connection()
  const queries = LOADERS.map((loader) =>
    queryServer<RevalidateData, RevalidateParams>({ loader, params: {} }),
  )
  return <Revalidate queries={queries} />
}

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-8 font-mono text-sm">loading…</div>}
    >
      <Probes />
    </Suspense>
  )
}
