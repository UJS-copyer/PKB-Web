export default function KnowledgeNoteLoading() {
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
      <article className="min-w-0">
        <div className="mb-6 h-8 w-28 rounded-md bg-muted" />
        <header className="mb-8 border-b border-border pb-8">
          <div className="h-4 w-64 rounded-md bg-muted" />
          <div className="mt-5 h-12 max-w-3xl rounded-md bg-muted" />
          <div className="mt-5 h-5 max-w-2xl rounded-md bg-muted/70" />
          <div className="mt-5 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-6 w-24 rounded-full bg-muted" />
          </div>
        </header>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-5 rounded-md bg-muted/70" style={{ width: `${92 - (index % 3) * 14}%` }} />
          ))}
        </div>
      </article>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-5">
          <div className="h-64 rounded-lg border border-border bg-card/40" />
          <div className="h-48 rounded-lg border border-border bg-card/40" />
        </div>
      </aside>
    </main>
  );
}
