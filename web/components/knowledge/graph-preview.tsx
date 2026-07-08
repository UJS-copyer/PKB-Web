type GraphPreviewData = {
  nodes: Array<{ id: string; title: string; group?: string }>;
  links: Array<{ source: string; target: string }>;
};

export function GraphPreview({ graph }: { graph: GraphPreviewData }) {
  const nodes = graph.nodes.slice(0, 18);
  const links = graph.links.slice(0, 28);
  const radius = 132;
  const center = 150;
  const positions = new Map(
    nodes.map((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
      return [
        node.id,
        {
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius
        }
      ] as const;
    })
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">知识图谱</p>
      </div>
      <svg viewBox="0 0 300 300" className="h-72 w-full">
        {links.map((link, index) => {
          const source = positions.get(link.source);
          const target = positions.get(link.target);
          if (!source || !target) return null;
          return (
            <line
              key={`${link.source}-${link.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="currentColor"
              strokeOpacity="0.16"
            />
          );
        })}
        {nodes.map((node, index) => {
          const position = positions.get(node.id);
          if (!position) return null;
          return (
            <g key={node.id}>
              <circle
                cx={position.x}
                cy={position.y}
                r={index === 0 ? 8 : 5}
                className={index === 0 ? "fill-accent" : "fill-foreground/70"}
              />
              {index < 7 ? (
                <text x={position.x + 8} y={position.y + 4} className="fill-muted-foreground text-[8px]">
                  {node.title.slice(0, 10)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
