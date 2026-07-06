import { getAllNotes, getGraphData, getKnowledgeTreeNodes, getRecentNotes } from "@/lib/content/source";
import { KnowledgeExplorer } from "./knowledge-explorer";

export async function KnowledgeShell({ initialQuery = "" }: { initialQuery?: string }) {
  const [tree, notes, recent, graph] = await Promise.all([
    getKnowledgeTreeNodes(),
    getAllNotes(),
    getRecentNotes(12),
    getGraphData(28)
  ]);
  const random = notes.length > 0 ? notes[Math.floor(Date.now() / 86_400_000) % notes.length] : undefined;

  return <KnowledgeExplorer tree={tree} notes={notes} recent={recent} random={random} graph={graph} initialQuery={initialQuery} />;
}
