export default function KnowledgeLoading() {
  return (
    <main className="mx-auto grid max-w-[1680px] gap-5 px-3 py-5 sm:px-6 sm:py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[300px_minmax(0,1fr)_260px] 2xl:grid-cols-[320px_minmax(0,1fr)_280px]">
      <aside className="hidden lg:block">
        <div className="h-[calc(100vh-10rem)] animate-pulse rounded-lg border border-border/80 bg-card/35" />
      </aside>
      <section className="min-w-0 space-y-5">
        <div className="animate-pulse rounded-lg border border-border/80 bg-card/45 p-6">
          <div className="h-3 w-44 rounded bg-muted" />
          <div className="mt-5 h-10 w-56 rounded bg-muted" />
          <div className="mt-4 h-4 w-full max-w-xl rounded bg-muted" />
          <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
          <div className="mt-6 h-10 rounded bg-muted" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-8 w-20 rounded bg-muted" />
            <div className="h-8 w-20 rounded bg-muted" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-lg border border-border/80 bg-card/35 p-5">
            <div className="h-3 w-36 rounded bg-muted" />
            <div className="mt-4 h-7 w-2/5 rounded bg-muted" />
            <div className="mt-4 h-4 w-full rounded bg-muted" />
            <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </section>
      <aside className="hidden xl:block">
        <div className="h-64 animate-pulse rounded-lg border border-border/80 bg-card/35" />
        <div className="mt-5 h-80 animate-pulse rounded-lg border border-border/80 bg-card/35" />
      </aside>
    </main>
  );
}
