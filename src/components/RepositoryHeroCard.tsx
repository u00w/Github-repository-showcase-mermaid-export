import React, { useMemo, useState } from 'react';
import { Star, GitFork, Bug, Calendar, ExternalLink, Copy, Check, ShieldCheck, Tag, Sparkles, Palette, Code2, Workflow } from 'lucide-react';
import { FullRepoResponse, ThemeStyle } from '../types';
import { MermaidDiagram } from './MermaidDiagram';
import { WebArchitectureDiagram } from './WebArchitectureDiagram';
import { generateDefaultUmlDiagram } from '../utils/umlGenerator';

interface RepositoryHeroCardProps {
  data: FullRepoResponse;
  activeTheme: ThemeStyle;
  onThemeChange: (theme: ThemeStyle) => void;
}

export const RepositoryHeroCard: React.FC<RepositoryHeroCardProps> = ({
  data,
  activeTheme,
  onThemeChange,
}) => {
  const { repo, latestRelease } = data;
  const [copiedClone, setCopiedClone] = useState(false);
  const [diagramView, setDiagramView] = useState<'mermaid' | 'web'>('web');

  const architectureDiagram = useMemo(
    () => generateDefaultUmlDiagram(data),
    [data]
  );
  const architectureDiagramSource = architectureDiagram.mermaidCode || 'classDiagram\n  class Repository\n';


  const cloneUrl = `https://github.com/${repo.full_name}.git`;

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneUrl);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Theme styling definitions
  const themeStyles: Record<ThemeStyle, { container: string; textMain: string; textMuted: string; badge: string; border: string; accentBtn: string }> = {
    'modern-light': {
      container: 'bg-white text-slate-900 border-slate-200 shadow-xl shadow-slate-200/50',
      textMain: 'text-slate-900',
      textMuted: 'text-slate-600',
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      border: 'border-slate-200',
      accentBtn: 'bg-[#eab308] hover:bg-[#facc15] text-slate-950'
    },
    'dark-emerald': {
      container: 'bg-slate-950 text-emerald-100 border-emerald-900/50 shadow-2xl shadow-emerald-950/50',
      textMain: 'text-emerald-50',
      textMuted: 'text-emerald-300/70',
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50',
      border: 'border-emerald-900/40',
      accentBtn: 'bg-[#eab308] hover:bg-[#facc15] text-slate-950 font-semibold'
    },
    'github-dark': {
      container: 'bg-[#0d1117] text-[#c9d1d9] border-[#30363d] shadow-2xl',
      textMain: 'text-[#f0f6fc]',
      textMuted: 'text-[#8b949e]',
      badge: 'bg-[#21262d] text-[#58a6ff] border-[#30363d]',
      border: 'border-[#30363d]',
      accentBtn: 'bg-[#eab308] hover:bg-[#facc15] text-slate-950'
    },
    'glassmorphism': {
      container: 'bg-slate-900/60 backdrop-blur-xl text-slate-100 border-slate-700/50 shadow-2xl',
      textMain: 'text-white',
      textMuted: 'text-slate-300/80',
      badge: 'bg-white/10 text-white border-white/20',
      border: 'border-white/10',
      accentBtn: 'bg-[#eab308] hover:bg-[#facc15] text-slate-950'
    },
    'cyberpunk': {
      container: 'bg-black text-cyan-300 border-pink-500/80 shadow-2xl shadow-pink-500/10',
      textMain: 'text-yellow-300 font-mono',
      textMuted: 'text-cyan-400/80',
      badge: 'bg-pink-950/80 text-pink-300 border-pink-500/40 font-mono',
      border: 'border-pink-500/30',
      accentBtn: 'bg-[#eab308] hover:bg-[#facc15] text-slate-950 font-bold font-mono'
    }
  };

  const currentTheme = themeStyles[activeTheme];

  return (
    <div className="space-y-4">
      {/* Theme Toggler Controls */}
      {/* Main Hero Showcase Card */}
      <div className={`p-6 md:p-8 border transition-all relative overflow-hidden ${currentTheme.container}`}>
        
        {/* Subtle Decorative Ambient Background Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#eab308]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          
          {/* Main Info Header */}
          <div className="space-y-3.5 max-w-2xl">
            
            {/* Owner & Name */}
            <div className="flex items-center gap-3">
              <img
                src={repo.owner.avatar_url}
                alt={repo.owner.login}
                className="w-12 h-12 border border-black/10 object-cover shadow-sm shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={repo.owner.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs font-medium hover:underline ${currentTheme.textMuted}`}
                  >
                    {repo.owner.login}
                  </a>
                  <span className={currentTheme.textMuted}>/</span>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xl md:text-2xl font-bold hover:underline tracking-tight ${currentTheme.textMain}`}
                  >
                    {repo.name}
                  </a>
                </div>

                {/* Primary Badges */}
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                  {repo.language && (
                    <span className={`px-2.5 py-0.5 rounded-full border font-medium ${currentTheme.badge}`}>
                      {repo.language}
                    </span>
                  )}
                  {repo.license && (
                    <span className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${currentTheme.badge}`}>
                      <ShieldCheck className="w-3 h-3" />
                      {repo.license}
                    </span>
                  )}
                  {latestRelease && (
                    <span className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${currentTheme.badge}`}>
                      <Tag className="w-3 h-3" />
                      {latestRelease.tag_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className={`text-sm md:text-base leading-relaxed ${currentTheme.textMuted}`}>
              {repo.description || "No description provided for this repository."}
            </p>

            {/* Topics/Tags */}
            {repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {repo.topics.slice(0, 8).map((topic) => (
                  <span
                    key={topic}
                    className="px-2.5 py-0.5 text-[11px] font-medium rounded-md bg-black/10 text-slate-300 border border-white/10"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons & Clone Box */}
          <div className="flex flex-col gap-3 shrink-0 lg:w-72">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.99] ${currentTheme.accentBtn}`}
            >
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>

            {repo.homepage && (
              <a
                href={repo.homepage.startsWith('http') ? repo.homepage : `https://${repo.homepage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-4 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live Demo Site
              </a>
            )}

            {/* Git Clone Box */}
            <div className="bg-black/20 border border-white/10 p-2.5 space-y-1.5">
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${currentTheme.textMuted}`}>
                Clone Repository:
              </span>
              <div className="flex items-center gap-1.5 bg-black/40 p-1.5 font-mono text-[11px] text-slate-300 border border-white/5">
                <span className="truncate flex-1 select-all">{cloneUrl}</span>
                <button
                  onClick={handleCopyClone}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 transition-colors shrink-0"
                  title="Copy Clone Command"
                >
                  {copiedClone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`relative z-10 mt-6 border bg-black/20 p-3 ${currentTheme.border}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className={`text-xs font-semibold tracking-wide ${currentTheme.textMain}`}>
              Architecture Diagram
            </h4>
            <div className="flex border border-white/10 bg-black/20 p-0.5 text-[10px] font-medium">
              <button
                type="button"
                onClick={() => setDiagramView('mermaid')}
                className={`flex items-center gap-1 px-2 py-1 transition ${diagramView === 'mermaid' ? 'bg-[#eab308] text-slate-950' : currentTheme.textMuted}`}
                aria-pressed={diagramView === 'mermaid'}
              >
                <Code2 className="w-3 h-3" /> Mermaid
              </button>
              <button
                type="button"
                onClick={() => setDiagramView('web')}
                className={`flex items-center gap-1 px-2 py-1 transition ${diagramView === 'web' ? 'bg-[#eab308] text-slate-950' : currentTheme.textMuted}`}
                aria-pressed={diagramView === 'web'}
              >
                <Workflow className="w-3 h-3" /> Interactive
              </button>
            </div>
          </div>
          {diagramView === 'mermaid' ? (
            <MermaidDiagram chart={architectureDiagramSource} />
          ) : (
            <WebArchitectureDiagram
              classes={architectureDiagram.classes}
              relationships={architectureDiagram.relationships}
              repoFullName={repo.full_name}
              defaultBranch={repo.default_branch}
            />
          )}
        </div>

        {/* Live Metrics Grid Footer */}
        <div className={`mt-6 pt-5 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 ${currentTheme.border}`}>
          <div className="flex items-center gap-3 p-2.5 bg-black/10 border border-white/5">
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-sm font-bold ${currentTheme.textMain}`}>
                {repo.stargazers_count.toLocaleString()}
              </div>
              <div className={`text-[11px] ${currentTheme.textMuted}`}>Stars</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 bg-black/10 border border-white/5">
            <div className="p-2 bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-sm font-bold ${currentTheme.textMain}`}>
                {repo.forks_count.toLocaleString()}
              </div>
              <div className={`text-[11px] ${currentTheme.textMuted}`}>Forks</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 bg-black/10 border border-white/5">
            <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-sm font-bold ${currentTheme.textMain}`}>
                {repo.open_issues_count.toLocaleString()}
              </div>
              <div className={`text-[11px] ${currentTheme.textMuted}`}>Open Issues</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 bg-black/10 border border-white/5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-sm font-bold ${currentTheme.textMain}`}>
                {formatDate(repo.pushed_at)}
              </div>
              <div className={`text-[11px] ${currentTheme.textMuted}`}>Last Pushed</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
