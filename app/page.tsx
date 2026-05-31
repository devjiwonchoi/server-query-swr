import Link from 'next/link'

export default function Page() {
  return (
    <main
      style={{ padding: 24, fontFamily: 'monospace', display: 'grid', gap: 8 }}
    >
      <h1>server-query-swr</h1>
      <Link href="/demo/acme/1">
        /demo/[slug]/[id]: useServerQuerySWR (cache + no client fetch on first
        paint)
      </Link>
      <Link href="/revalidate">/revalidate: 10 queries, revalidate-all timing</Link>
      <Link href="/parallel">/parallel: route handler vs server action</Link>
    </main>
  )
}
