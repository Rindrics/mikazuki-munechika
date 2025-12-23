"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

/**
 * Mermaid ダイアグラムをレンダリングするコンポーネント
 */
export function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });

    const renderChart = async () => {
      if (!containerRef.current) return;

      try {
        const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        console.error("Mermaid rendering error:", err);
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className={`p-4 border border-danger rounded-lg bg-danger-light ${className}`}>
        <p className="text-danger-dark font-medium">ダイアグラムの描画に失敗しました</p>
        <pre className="mt-2 text-sm text-secondary overflow-x-auto">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
