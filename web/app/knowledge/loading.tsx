export default function KnowledgeLoading() {
  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="h-6 w-32 rounded-md bg-muted" />
          <div className="mt-6 h-12 max-w-xl rounded-md bg-muted" />
          <div className="mt-5 h-5 max-w-2xl rounded-md bg-muted/70" />
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr_340px] lg:px-8">
        <div className="hidden h-[32rem] rounded-lg border border-border bg-card/40 lg:block" />
        <div className="space-y-4">
          <div className="h-40 rounded-lg border border-border bg-card/40" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 rounded-lg border border-border bg-card/40" />
          ))}
        </div>
        <div className="hidden space-y-4 lg:block">
          <div className="h-44 rounded-lg border border-border bg-card/40" />
          <div className="h-72 rounded-lg border border-border bg-card/40" />
        </div>
      </div>
    </main>
  );
}
