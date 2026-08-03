import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const clampZoom = (value: number) => Math.min(2, Math.max(0.6, Number(value.toFixed(2))));
  const zoomIn = () => setZoom((current) => clampZoom(current + 0.2));
  const zoomOut = () => setZoom((current) => clampZoom(current - 0.2));
  const resetZoom = () => setZoom(1);

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
            background: '#020617',
            primaryColor: '#0f172a',
            primaryTextColor: '#e0e7ff',
            primaryBorderColor: '#818cf8',
            lineColor: '#818cf8',
            secondaryColor: '#1e293b',
            secondaryTextColor: '#cbd5e1',
            tertiaryColor: '#1e293b',
            tertiaryTextColor: '#cbd5e1',
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
            svgEl.style.width = `${zoom * 100}%`;
            svgEl.style.maxWidth = 'none';
            svgEl.style.height = 'auto';
            svgEl.style.display = 'block';
            svgEl.style.transformOrigin = 'top left';
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
  }, [chart, zoom]);

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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-300">Mermaid Diagram</p>
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/90 p-1 text-[11px] text-slate-300">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded-md p-1.5 transition hover:bg-slate-800 hover:text-yellow-300"
            aria-label="Zoom out Mermaid diagram"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-12 px-1 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded-md p-1.5 transition hover:bg-slate-800 hover:text-yellow-300"
            aria-label="Zoom in Mermaid diagram"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="rounded-md p-1.5 transition hover:bg-slate-800 hover:text-yellow-300"
            aria-label="Reset Mermaid zoom"
            title="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full overflow-auto rounded-lg border border-slate-700/70 bg-slate-950 text-slate-100"
        style={{ maxHeight: '72vh' }}
        aria-label="Repository architecture Mermaid diagram"
      />
    </div>
  );
};
