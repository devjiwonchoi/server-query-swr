'use server'

// Plain server action. Same work as the route handler: sleep `duration` ms, then
// echo `n` plus the server-side start timestamp. No parallel trick, so we can
// observe Next's documented behavior of dispatching server functions one at a
// time by default.
export async function echo({ n, duration }: { n: number; duration: number }) {
  const start = Date.now()
  console.log(`[action] start #${n} @ ${new Date(start).toISOString().slice(11, 23)}`)
  await new Promise((resolve) => setTimeout(resolve, duration))

  return { n, start }
}
