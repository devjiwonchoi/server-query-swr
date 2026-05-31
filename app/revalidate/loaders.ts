'use server'

import type { RevalidateData, RevalidateParams } from './types'

// 10 distinct server-function loaders. Each export is a distinct server function
// (distinct $$id => distinct useServerQuerySWR key), so the 10 usages on the
// page are 10 separate queries that do not dedupe into one.
//
// `duration` is injected by the client wrapper into `params`: useServerQuerySWR
// keys off route params and calls `loader({ params })`, so that is how a per-call
// value reaches the loader. The server prefetch passes no duration (=> 0), so
// the first paint is instant; only client revalidations are slow.
async function work(
  n: number,
  params: RevalidateParams | Promise<RevalidateParams>,
): Promise<RevalidateData> {
  const { duration = 0 } = (await params) ?? {}
  if (duration > 0) await new Promise((resolve) => setTimeout(resolve, duration))
  return { n, ranAt: Date.now() }
}

type Arg = { params: RevalidateParams | Promise<RevalidateParams> }

export const q1 = async ({ params }: Arg) => work(1, params)
export const q2 = async ({ params }: Arg) => work(2, params)
export const q3 = async ({ params }: Arg) => work(3, params)
export const q4 = async ({ params }: Arg) => work(4, params)
export const q5 = async ({ params }: Arg) => work(5, params)
export const q6 = async ({ params }: Arg) => work(6, params)
export const q7 = async ({ params }: Arg) => work(7, params)
export const q8 = async ({ params }: Arg) => work(8, params)
export const q9 = async ({ params }: Arg) => work(9, params)
export const q10 = async ({ params }: Arg) => work(10, params)
