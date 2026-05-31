// `duration` (ms) is injected by the client wrapper into the loader call so the
// per-query slowness is adjustable; see loaders.ts and client.tsx.
export type RevalidateParams = { duration?: number }

export type RevalidateData = { n: number; ranAt: number }
