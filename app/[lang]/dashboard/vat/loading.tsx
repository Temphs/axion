export default function VatLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
      <div className="h-44 animate-pulse rounded-2xl bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-white/10" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/10" />
    </div>
  )
}
