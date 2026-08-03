import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Code, FileText, List, Copy, Check, ExternalLink } from 'lucide-react';

interface ReadmeViewerProps {
  readmeText: string;
  repoFullName: string;
}

export const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ readmeText, repoFullName }) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Extract table of contents from markdown headings (#, ##, ###)
  const toc = useMemo(() => {
    if (!readmeText) return [];
    const lines = readmeText.split('\n');
    const headings: { id: string; text: string; level: number }[] = [];
    
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawText = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '');
        const id = rawText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ id, text: rawText, level });
      }
    });

    return headings;
  }, [readmeText]);

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(readmeText);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  if (!readmeText) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium">No README.md file found in this repository.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#eab308]" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            README.md
          </h3>
          <span className="text-slate-500 text-xs">({repoFullName})</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('rendered')}
              className={`px-2.5 py-1 transition-all flex items-center gap-1.5 ${
                viewMode === 'rendered' ? 'bg-[#eab308] text-slate-950 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Rendered
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 transition-all flex items-center gap-1.5 ${
                viewMode === 'raw' ? 'bg-[#eab308] text-slate-950 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Raw Markdown
            </button>
          </div>

          <button
            onClick={handleCopyRaw}
            className="p-1.5 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800"
            title="Copy Raw README text"
          >
            {copiedRaw ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content Layout with optional Table of Contents Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
        
        {/* Table of Contents (Desktop sidebar) */}
        {toc.length > 2 && viewMode === 'rendered' && (
          <aside className="lg:col-span-1 p-4 bg-slate-950/50 border-b lg:border-b-0 lg:border-r border-slate-800/80 max-h-96 overflow-y-auto">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              <List className="w-3.5 h-3.5 text-[#eab308]" />
              <span>Outline</span>
            </div>
            <ul className="space-y-1.5 text-xs">
              {toc.map((heading, i) => (
                <li
                  key={i}
                  style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                >
                  <a
                    href={`#${heading.id}`}
                    className="text-slate-400 hover:text-[#eab308] block truncate transition-colors"
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Main README Area */}
        <div className={`${toc.length > 2 && viewMode === 'rendered' ? 'lg:col-span-3' : 'lg:col-span-4'} p-6 md:p-8 overflow-x-auto`}>
          {viewMode === 'rendered' ? (
            <div className="prose prose-invert prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-100 prose-a:text-indigo-400 hover:prose-a:underline prose-code:text-indigo-300 prose-code:bg-slate-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-img:rounded-xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {readmeText}
              </ReactMarkdown>
            </div>
          ) : (
            <pre className="font-mono text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap break-all leading-relaxed">
              {readmeText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
