import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            background: '#0f172a',
            primaryColor: '#d1d5db',
            primaryTextColor: '#000000',
            lineColor: '#cbd5e1',
            tertiaryColor: '#e5e7eb',
            tertiaryTextColor: '#000000',
          },
        });

        const renderId = `repo-architecture-${Math.random().toString(36).slice(2)}`;
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        const { svg } = await mermaid.render(renderId, chart);

        if (!isCancelled && containerRef.current) {
          setRenderError(null);
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Mermaid render failed:', error, { chart });
        if (!isCancelled) {
          setRenderError(
            error instanceof Error
              ? `Unable to render architecture diagram: ${error.message}`
              : 'Unable to render architecture diagram.'
          );
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [chart]);

  if (renderError) {
    return (
      <div className={className}>
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {renderError}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="w-full overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950 text-slate-100"
        aria-label="Repository architecture Mermaid diagram"
      />
    </div>
  );
};
