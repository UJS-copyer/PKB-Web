export default function KnowledgeNoteLoading() {
  return (
    <main className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,900px)_280px] lg:px-8 xl:grid-cols-[minmax(0,980px)_300px]">
      <article className="min-w-0 animate-pulse">
        <div className="h-8 w-32 rounded bg-muted" />
        <header className="mb-8 mt-8 border-b border-border/80 pb-8">
          <div className="h-3 w-72 rounded bg-muted" />
          <div className="mt-5 h-12 w-2/3 rounded bg-muted" />
          <div className="mt-5 h-4 w-80 rounded bg-muted" />
          <div className="mt-5 h-5 w-full max-w-3xl rounded bg-muted" />
        </header>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-4 rounded bg-muted" style={{ width: `${96 - (index % 4) * 12}%` }} />
          ))}
        </div>
      </article>
      <aside className="hidden animate-pulse space-y-5 lg:block">
        <div className="h-72 rounded-lg border border-border/80 bg-card/45" />
        <div className="h-44 rounded-lg border border-border/80 bg-card/45" />
      </aside>
    </main>
  );
}
