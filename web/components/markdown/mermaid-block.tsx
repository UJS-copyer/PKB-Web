"use client";

import { useEffect, useId, useState } from "react";

export function MermaidBlock({ code }: { code: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict"
        });
        const result = await mermaid.render(`mermaid-${id}`, code);
        if (mounted) {
          setSvg(result.svg);
          setError("");
        }
      } catch (renderError) {
        if (mounted) {
          setError(renderError instanceof Error ? renderError.message : "Mermaid render failed");
        }
      }
    }

    void render();
    return () => {
      mounted = false;
    };
  }, [code, id]);

  if (error) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  if (!svg) {
    return <div className="my-6 rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground">Rendering diagram...</div>;
  }

  return (
    <div
      className="my-6 overflow-x-auto rounded-lg border border-border bg-[#0b0b0b] p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
