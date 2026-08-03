import React from 'react';
import { LanguageBreakdown } from '../types';
import { Code2, Tag, ShieldCheck, GitBranch } from 'lucide-react';

interface TechStackBreakdownProps {
  languages: LanguageBreakdown;
  topics: string[];
  license: string | null;
  defaultBranch: string;
}

// Map of common GitHub language colors
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
};

export const TechStackBreakdown: React.FC<TechStackBreakdownProps> = ({
  languages,
  topics,
  license,
  defaultBranch,
}) => {
  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);

  const langPercentages = Object.entries(languages).map(([lang, bytes]) => ({
    language: lang,
    bytes,
    percentage: totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : '0',
    color: LANGUAGE_COLORS[lang] || '#8b949e',
  }));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Language Composition & Tech Stack
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {langPercentages.length} {langPercentages.length === 1 ? 'Language' : 'Languages'}
        </span>
      </div>

      {/* Stacked Percentage Progress Bar */}
      {langPercentages.length > 0 ? (
        <div className="space-y-3">
          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            {langPercentages.map((item) => (
              <div
                key={item.language}
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color,
                }}
                className="h-full transition-all hover:opacity-80 cursor-pointer"
                title={`${item.language}: ${item.percentage}%`}
              />
            ))}
          </div>

          {/* Language Color Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs">
            {langPercentages.map((item) => (
              <div key={item.language} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-300">{item.language}</span>
                <span className="text-slate-500 font-mono text-[11px]">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No language metrics available.</p>
      )}

      {/* Meta Pills (Topics & License) */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Default Branch:</span>
          <span className="font-mono text-indigo-300 font-medium bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40">
            {defaultBranch}
          </span>
        </div>

        {license && (
          <div className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>License: <strong className="text-slate-100">{license}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
