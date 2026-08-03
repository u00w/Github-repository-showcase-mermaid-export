import React, { useState } from 'react';
import { FullRepoResponse, ThemeStyle } from '../types';
import { Code2, Copy, Check, Share2, Layers, ShieldCheck, Terminal, FileCode, FileType, Braces, Package } from 'lucide-react';
import { generateDefaultUmlDiagram } from '../utils/umlGenerator';

interface EmbedCodeGeneratorProps {
  data: FullRepoResponse;
  activeTheme: ThemeStyle;
}

type EmbedType = 'iframe' | 'react' | 'tailwind' | 'markdown' | 'html' | 'css' | 'javascript' | 'combined';

// Safely escape a string for use inside HTML attribute values (double-quoted)
function escAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Safely escape a string for use inside HTML text content
function escHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Safely escape a string for use inside a JS string literal (single-quoted)
function escJs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/<\/script>/gi, '<\\/script>');
}

export const EmbedCodeGenerator: React.FC<EmbedCodeGeneratorProps> = ({ data, activeTheme }) => {
  const { repo } = data;
  const [embedType, setEmbedType] = useState<EmbedType>('tailwind');
  const [copied, setCopied] = useState(false);

  // ── Existing snippet generators ──────────────────────────────────────────

  const getIframeCode = () => {
    return `<!-- Full-card parity: this iframe renders the complete repository showcase card from /embed (header, diagrams, tech stack, and structure). -->
<iframe\n  src="${window.location.origin}/embed?repo=${encodeURIComponent(repo.full_name)}&theme=${activeTheme}"\n  width="100%"\n  height="240"\n  style="border: none; border-radius: 12px; overflow: hidden;"\n  title="${escAttr(repo.full_name)} GitHub Showcase"\n></iframe>`;
  };

  const getExportCardData = () => {
    const architectureDiagram = generateDefaultUmlDiagram(data);
    const languageEntries = Object.entries(data.languages)
      .sort(([, a], [, b]) => b - a)
      .map(([name, bytes]) => ({ name, bytes }));
    const treePaths = data.tree
      .map((item) => item.path)
      .filter((path) => !path.startsWith('.'))
      .slice(0, 24);

    const snippetData = {
      repo: {
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        ownerAvatarUrl: repo.owner.avatar_url,
        htmlUrl: repo.html_url,
        description: repo.description || '',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        primaryLanguage: repo.language || 'Repository',
        license: repo.license || 'Open Source',
        defaultBranch: repo.default_branch || 'main',
        topics: repo.topics.slice(0, 12),
      },
      languages: languageEntries,
      diagrams: {
        mermaidCode: architectureDiagram.mermaidCode || 'classDiagram\n  class Repository',
        plantUmlCode: architectureDiagram.plantUmlCode || '@startuml\nclass Repository\n@enduml',
        classes: architectureDiagram.classes.map((item) => ({
          id: item.id,
          name: item.name,
          stereotype: item.stereotype || 'class',
          packageName: item.packageName || '',
          attributes: item.attributes.map((attr) => `${attr.visibility || '+'}${attr.name}: ${attr.type}`),
          methods: item.methods.map((method) => `${method.visibility || '+'}${method.name}(${method.parameters || ''}): ${method.returnType}`),
        })),
        relationships: architectureDiagram.relationships.map((rel) => ({
          fromId: rel.fromId,
          toId: rel.toId,
          type: rel.type,
          label: rel.label || rel.type,
        })),
      },
      treePaths,
    };
    return snippetData;
  };

  const getReactCode = () => {
    const snippetData = getExportCardData();
    const serializedData = JSON.stringify(snippetData, null, 2);

    return `import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

export function GitHubRepoCard({ renderWebArchitecture } = {}) {
  const data = ${serializedData};
  const [activeDiagram, setActiveDiagram] = useState('mermaid');
  const [mermaidError, setMermaidError] = useState('');
  const mermaidContainerRef = useRef(null);

  useEffect(() => {
    if (activeDiagram !== 'mermaid') return;
    let cancelled = false;

    const renderMermaid = async () => {
      if (!mermaidContainerRef.current) return;
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
        const renderId = 'repo-card-diagram-' + Math.random().toString(36).slice(2);
        const { svg } = await mermaid.render(renderId, data.diagrams.mermaidCode);
        if (!cancelled && mermaidContainerRef.current) {
          setMermaidError('');
          mermaidContainerRef.current.innerHTML = svg;
          const svgEl = mermaidContainerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.display = 'block';
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMermaidError(error instanceof Error ? error.message : 'Unable to render Mermaid diagram.');
        }
      }
    };

    renderMermaid();
    return () => { cancelled = true; };
  }, [activeDiagram, data.diagrams.mermaidCode]);

  const totalLanguageBytes = useMemo(
    () => data.languages.reduce((sum, item) => sum + item.bytes, 0),
    []
  );

  return (
    <article className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 max-w-4xl shadow-xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={data.repo.ownerAvatarUrl} alt={data.repo.owner} className="w-10 h-10 rounded-xl border border-slate-700" />
          <div>
            <h3 className="font-bold text-base text-white">{data.repo.fullName}</h3>
            <p className="text-xs text-slate-400">{data.repo.owner}</p>
          </div>
        </div>
        <a
          href={data.repo.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
        >
          View Repo
        </a>
      </header>

      <p className="text-xs text-slate-300 leading-relaxed">{data.repo.description}</p>

      <div className="flex flex-wrap items-center gap-2">
        {data.repo.topics.map((topic) => (
          <span key={topic} className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800 border border-slate-700 text-slate-300">
            #{topic}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">⭐ {data.repo.stars.toLocaleString()}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">🍴 {data.repo.forks.toLocaleString()}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">🐞 {data.repo.openIssues.toLocaleString()}</div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-indigo-300">{data.repo.primaryLanguage}</div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-white">Architecture Diagrams</h4>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 text-[11px]">
            {[
              ['mermaid', 'Mermaid'],
              ['web', 'Interactive Web'],
              ['plantuml', 'PlantUML'],
              ['specs', 'Class Inventory'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDiagram(key)}
                className={\`px-2.5 py-1 rounded-md transition \${activeDiagram === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}\`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeDiagram === 'mermaid' && (
          <div className="space-y-2">
            {mermaidError && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg p-2">
                Mermaid render failed: {mermaidError}
              </p>
            )}
            <div ref={mermaidContainerRef} className="w-full overflow-x-auto rounded-lg border border-slate-700 bg-white text-slate-900 p-2" />
          </div>
        )}

        {activeDiagram === 'web' && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300 space-y-2">
            {typeof renderWebArchitecture === 'function' ? (
              renderWebArchitecture({
                classes: data.diagrams.classes,
                relationships: data.diagrams.relationships,
              })
            ) : (
              <>
                <p className="text-slate-200 font-medium">
                  Interactive Web Architecture hook is available.
                </p>
                <p>
                  Pass a renderWebArchitecture function prop to wire this tab to your interactive renderer (same architecture as this project’s WebArchitectureDiagram).
                </p>
              </>
            )}
          </div>
        )}

        {activeDiagram === 'plantuml' && (
          <pre className="text-[11px] text-emerald-200 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">
{data.diagrams.plantUmlCode}
          </pre>
        )}

        {activeDiagram === 'specs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.diagrams.classes.slice(0, 10).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs">
                <p className="font-semibold text-slate-100">{item.name}</p>
                <p className="text-[11px] text-slate-400">{item.stereotype} · {item.packageName || 'root'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-white">Language Composition &amp; Tech Stack</h4>
        <div className="space-y-2">
          {data.languages.map((language) => {
            const pct = totalLanguageBytes > 0 ? Math.round((language.bytes / totalLanguageBytes) * 100) : 0;
            return (
              <div key={language.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{language.name}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: \`\${pct}%\` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">Primary: {data.repo.primaryLanguage}</span>
          <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">License: {data.repo.license}</span>
          <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">Branch: {data.repo.defaultBranch}</span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
        <h4 className="text-sm font-semibold text-white">Repository Structure ({data.repo.defaultBranch})</h4>
        <pre className="text-[11px] leading-relaxed text-slate-300 font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">
{data.treePaths.map((path) => \`• \${path}\`).join('\\n')}
        </pre>
      </section>

      <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
        Exported from the GitHub Repository Showcase card generator.
      </div>
    </article>
  );
}`;
  };

  const getTailwindCode = () => {
    const cardData = getExportCardData();
    const total = cardData.languages.reduce((sum, item) => sum + item.bytes, 0);
    const languageRows = cardData.languages.map((item) => {
      const pct = total > 0 ? Math.round((item.bytes / total) * 100) : 0;
      return `<div class="space-y-1">
  <div class="flex items-center justify-between text-xs text-slate-300"><span>${escHtml(item.name)}</span><span>${pct}%</span></div>
  <div class="h-2 rounded-full bg-slate-800 overflow-hidden"><div class="h-full bg-indigo-500" style="width:${pct}%"></div></div>
</div>`;
    }).join('\n');
    const treeRows = cardData.treePaths.map((path) => `• ${escHtml(path)}`).join('\n');
    const classRows = cardData.diagrams.classes.slice(0, 10).map((item) => `<div class="rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs">
  <p class="font-semibold text-slate-100">${escHtml(item.name)}</p>
  <p class="text-[11px] text-slate-400">${escHtml(item.stereotype)} · ${escHtml(item.packageName || 'root')}</p>
</div>`).join('\n');
    return `<!-- GitHub Repository Showcase Card (Tailwind-only markup) -->
<article class="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 max-w-4xl shadow-xl space-y-5">
  <header class="flex items-start justify-between gap-4">
    <div class="flex items-center gap-3">
      <img src="${escAttr(cardData.repo.ownerAvatarUrl)}" alt="${escAttr(cardData.repo.owner)}" class="w-10 h-10 rounded-xl border border-slate-700" />
      <div>
        <h3 class="font-bold text-base text-white">${escHtml(cardData.repo.fullName)}</h3>
        <p class="text-xs text-slate-400">${escHtml(cardData.repo.owner)}</p>
      </div>
    </div>
    <a href="${escAttr(cardData.repo.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold">View Repo</a>
  </header>
  <p class="text-xs text-slate-300 leading-relaxed">${escHtml(cardData.repo.description)}</p>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
    <div class="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">⭐ ${cardData.repo.stars.toLocaleString()}</div>
    <div class="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">🍴 ${cardData.repo.forks.toLocaleString()}</div>
    <div class="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">🐞 ${cardData.repo.openIssues.toLocaleString()}</div>
    <div class="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-indigo-300">${escHtml(cardData.repo.primaryLanguage)}</div>
  </div>
  <section class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
    <h4 class="text-sm font-semibold text-white">Architecture Diagrams</h4>
    <p class="text-xs text-slate-400">For interactive tabs + Mermaid rendering, pair this with the JavaScript export.</p>
    <pre class="text-[11px] text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">${escHtml(cardData.diagrams.mermaidCode)}</pre>
    <pre class="text-[11px] text-emerald-200 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">${escHtml(cardData.diagrams.plantUmlCode)}</pre>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${classRows}</div>
  </section>
  <section class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
    <h4 class="text-sm font-semibold text-white">Language Composition &amp; Tech Stack</h4>
    <div class="space-y-2">${languageRows}</div>
    <div class="flex flex-wrap gap-2 pt-1">
      <span class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">Primary: ${escHtml(cardData.repo.primaryLanguage)}</span>
      <span class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">License: ${escHtml(cardData.repo.license)}</span>
      <span class="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">Branch: ${escHtml(cardData.repo.defaultBranch)}</span>
    </div>
  </section>
  <section class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
    <h4 class="text-sm font-semibold text-white">Repository Structure (${escHtml(cardData.repo.defaultBranch)})</h4>
    <pre class="text-[11px] leading-relaxed text-slate-300 font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">${treeRows}</pre>
  </section>
</article>`;
  };

  const getMarkdownCode = () => {
    return `> **Full-card parity note:** Markdown is badge-only; use iFrame or Combined (HTML + CSS + JS) snippets for the complete interactive showcase card.

[![${repo.full_name} GitHub Showcase](https://img.shields.io/github/stars/${repo.full_name}?style=for-the-badge&logo=github&color=6366f1)](https://github.com/${repo.full_name})
[![License](https://img.shields.io/github/license/${repo.full_name}?style=for-the-badge&color=10b981)](https://github.com/${repo.full_name})`;
  };

  // ── New standalone HTML/CSS/JS generators ────────────────────────────────

  const getHtmlCode = () => {
    return `<!-- GitHub Repository Card — plain HTML (link repo-card.css and repo-card.js) -->
<div class="repo-card" id="repo-card">
  <!-- JS export injects complete parity card content here:
       - repo header/basic metadata
       - architecture diagram tabs (Mermaid / Interactive Web / PlantUML / Class Inventory)
       - Language Composition & Tech Stack
       - Repository Structure (main/default branch) -->
</div>`;
  };

  const getCssCode = () => {
    return `/* GitHub Repository Showcase Card */
/* Drop this file alongside repo-card.html and repo-card.js */

.repo-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  max-width: 960px;
  border-radius: 16px;
  background: #0f172a;
  border: 1px solid #1e293b;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 13px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.repo-card:hover { border-color: rgba(99, 102, 241, 0.5); box-shadow: 0 6px 32px rgba(99, 102, 241, 0.15); }
.repo-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.repo-card__owner-group { display: flex; align-items: center; gap: 12px; }
.repo-card__avatar { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #334155; flex-shrink: 0; }
.repo-card__meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.repo-card__name { font-weight: 700; font-size: 14px; color: #f1f5f9; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.repo-card__owner { font-size: 11px; color: #94a3b8; }
.repo-card__btn { flex-shrink: 0; padding: 6px 12px; background: #4f46e5; color: #fff; border-radius: 8px; font-size: 11px; font-weight: 600; text-decoration: none; transition: background 0.15s ease; }
.repo-card__btn:hover { background: #6366f1; }
.repo-card__description { margin: 0; font-size: 12px; line-height: 1.6; color: #cbd5e1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.repo-card__stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.repo-card__stat { border: 1px solid #1e293b; background: rgba(2, 6, 23, 0.7); border-radius: 10px; padding: 8px 10px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 11px; color: #94a3b8; }
.repo-card__section { border: 1px solid #1e293b; border-radius: 12px; background: rgba(2, 6, 23, 0.7); padding: 14px; }
.repo-card__section-title { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #f8fafc; }
.repo-card__diagram-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.repo-card__tab-btn { border: 1px solid #334155; background: #0b1220; color: #94a3b8; border-radius: 8px; font-size: 11px; font-weight: 600; padding: 6px 10px; cursor: pointer; }
.repo-card__tab-btn.is-active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.repo-card__diagram-pane { border: 1px solid #1e293b; background: #020617; border-radius: 10px; padding: 10px; }
.repo-card__diagram-pane.is-hidden { display: none; }
.repo-card__diagram-mermaid { overflow-x: auto; background: #fff; color: #0f172a; border-radius: 8px; padding: 8px; }
.repo-card__diagram-error { margin: 0 0 8px; color: #fecdd3; font-size: 11px; }
.repo-card__codeblock { margin: 0; overflow-x: auto; white-space: pre; font-size: 11px; color: #e2e8f0; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
.repo-card__codeblock--plantuml { color: #a7f3d0; }
.repo-card__class-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.repo-card__class-item { border: 1px solid #1e293b; border-radius: 8px; background: #0b1220; padding: 8px; }
.repo-card__class-name { margin: 0; color: #f1f5f9; font-weight: 700; font-size: 12px; }
.repo-card__class-meta { margin: 4px 0 0; color: #94a3b8; font-size: 11px; }
.repo-card__language-list { display: flex; flex-direction: column; gap: 8px; }
.repo-card__language-row { display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 4px; }
.repo-card__bar { height: 8px; border-radius: 999px; background: #1e293b; overflow: hidden; }
.repo-card__bar-fill { height: 100%; background: #6366f1; }
.repo-card__tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.repo-card__tag { border: 1px solid #334155; background: #0b1220; border-radius: 8px; padding: 4px 8px; font-size: 11px; color: #cbd5e1; }
.repo-card__tree { margin: 0; white-space: pre; overflow-x: auto; font-size: 11px; line-height: 1.5; color: #cbd5e1; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
.repo-card__placeholder { margin: 0; color: #cbd5e1; font-size: 12px; }
@media (max-width: 720px) {
  .repo-card__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .repo-card__class-grid { grid-template-columns: 1fr; }
}
.repo-card--light { background: #ffffff; border-color: #e2e8f0; color: #1e293b; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); }
.repo-card--light .repo-card__section,
.repo-card--light .repo-card__stat,
.repo-card--light .repo-card__class-item,
.repo-card--light .repo-card__tab-btn,
.repo-card--light .repo-card__tag,
.repo-card--light .repo-card__diagram-pane { background: #f8fafc; border-color: #cbd5e1; color: #334155; }
.repo-card--light .repo-card__section-title,
.repo-card--light .repo-card__name,
.repo-card--light .repo-card__class-name { color: #0f172a; }
.repo-card--light .repo-card__owner,
.repo-card--light .repo-card__class-meta,
.repo-card--light .repo-card__language-row { color: #64748b; }
.repo-card--light .repo-card__diagram-mermaid { border: 1px solid #cbd5e1; }
.repo-card--light .repo-card__codeblock { color: #1e293b; }
.repo-card--light .repo-card__codeblock--plantuml { color: #166534; }
.repo-card--light .repo-card__tree { color: #334155; }
.repo-card--light .repo-card__tab-btn.is-active { color: #fff; }`;
  };

  const getJsCode = () => {
    const cardData = getExportCardData();
    const serialized = escJs(JSON.stringify(cardData));
    return `/**
 * GitHub Repository Showcase Card — Vanilla JS
 * Requires repo-card.css and optionally mermaid.min.js for Mermaid rendering.
 */

(function () {
  'use strict';

  var REPO_DATA = JSON.parse('${serialized}');

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtNum(n) {
    return Number(n).toLocaleString();
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function renderLanguageRows(languages) {
    var total = (languages || []).reduce(function (sum, item) { return sum + (item.bytes || 0); }, 0);
    return (languages || []).map(function (item) {
      var value = pct(item.bytes || 0, total);
      return '<div>' +
        '<div class="repo-card__language-row"><span>' + esc(item.name) + '</span><span>' + value + '%</span></div>' +
        '<div class="repo-card__bar"><div class="repo-card__bar-fill" style="width:' + value + '%"></div></div>' +
      '</div>';
    }).join('');
  }

  function renderClassRows(classes) {
    return (classes || []).slice(0, 10).map(function (item) {
      return '<div class="repo-card__class-item">' +
        '<p class="repo-card__class-name">' + esc(item.name) + '</p>' +
        '<p class="repo-card__class-meta">' + esc(item.stereotype || 'class') + ' · ' + esc(item.packageName || 'root') + '</p>' +
      '</div>';
    }).join('');
  }

  function renderTree(paths) {
    return (paths || []).map(function (path) { return '• ' + path; }).join('\\n');
  }

  function bindDiagramUi(el, data) {
    var buttons = el.querySelectorAll('[data-diagram-tab]');
    var panes = el.querySelectorAll('[data-diagram-pane]');
    function setActive(tab) {
      buttons.forEach(function (btn) {
        var on = btn.getAttribute('data-diagram-tab') === tab;
        btn.classList.toggle('is-active', on);
      });
      panes.forEach(function (pane) {
        var on = pane.getAttribute('data-diagram-pane') === tab;
        pane.classList.toggle('is-hidden', !on);
      });
      if (tab === 'mermaid') renderMermaid(el, data.diagrams.mermaidCode || '');
    }
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { setActive(btn.getAttribute('data-diagram-tab')); });
    });
    setActive('mermaid');
  }

  function renderMermaid(el, code) {
    var container = el.querySelector('[data-mermaid-container]');
    var error = el.querySelector('[data-mermaid-error]');
    if (!container) return;
    if (error) error.textContent = '';
    if (!window.mermaid) {
      container.innerHTML = '<p class="repo-card__placeholder">Mermaid not loaded. Include mermaid.min.js to enable rendering.</p>';
      return;
    }
    try {
      window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
      var renderId = 'repo-card-mermaid-' + Math.random().toString(36).slice(2);
      window.mermaid.render(renderId, code).then(function (result) {
        container.innerHTML = result.svg;
        var svg = container.querySelector('svg');
        if (svg) {
          svg.style.width = '100%';
          svg.style.height = 'auto';
          svg.style.display = 'block';
        }
      }).catch(function (err) {
        if (error) error.textContent = 'Mermaid render failed: ' + (err && err.message ? err.message : 'unknown error');
      });
    } catch (err) {
      if (error) error.textContent = 'Mermaid render failed: ' + (err && err.message ? err.message : 'unknown error');
    }
  }

  function renderCard(el, d) {
    el.className = 'repo-card';
    el.innerHTML =
      '<div class="repo-card__header">' +
        '<div class="repo-card__owner-group">' +
          '<img class="repo-card__avatar" src="' + esc(d.repo.ownerAvatarUrl) + '" alt="' + esc(d.repo.owner) + '" />' +
          '<div class="repo-card__meta">' +
            '<a class="repo-card__name" href="' + esc(d.repo.htmlUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(d.repo.fullName) + '</a>' +
            '<span class="repo-card__owner">' + esc(d.repo.owner) + '</span>' +
          '</div>' +
        '</div>' +
        '<a class="repo-card__btn" href="' + esc(d.repo.htmlUrl) + '" target="_blank" rel="noopener noreferrer">View Repo</a>' +
      '</div>' +
      '<p class="repo-card__description">' + esc(d.repo.description || '') + '</p>' +
      '<div class="repo-card__stats">' +
        '<span class="repo-card__stat">⭐ ' + fmtNum(d.repo.stars) + '</span>' +
        '<span class="repo-card__stat">🍴 ' + fmtNum(d.repo.forks) + '</span>' +
        '<span class="repo-card__stat">🐞 ' + fmtNum(d.repo.openIssues) + '</span>' +
        '<span class="repo-card__stat">' + esc(d.repo.primaryLanguage) + '</span>' +
      '</div>' +
      '<section class="repo-card__section">' +
        '<h4 class="repo-card__section-title">Architecture Diagrams</h4>' +
        '<div class="repo-card__diagram-tabs">' +
          '<button class="repo-card__tab-btn" data-diagram-tab="mermaid">Mermaid</button>' +
          '<button class="repo-card__tab-btn" data-diagram-tab="web">Interactive Web</button>' +
          '<button class="repo-card__tab-btn" data-diagram-tab="plantuml">PlantUML</button>' +
          '<button class="repo-card__tab-btn" data-diagram-tab="specs">Class Inventory</button>' +
        '</div>' +
        '<div class="repo-card__diagram-pane" data-diagram-pane="mermaid">' +
          '<p class="repo-card__diagram-error" data-mermaid-error></p>' +
          '<div class="repo-card__diagram-mermaid" data-mermaid-container></div>' +
        '</div>' +
        '<div class="repo-card__diagram-pane is-hidden" data-diagram-pane="web">' +
          '<p class="repo-card__placeholder">Interactive Web Architecture hook is available. Wire this tab to your own renderer for fully interactive diagrams.</p>' +
        '</div>' +
        '<div class="repo-card__diagram-pane is-hidden" data-diagram-pane="plantuml">' +
          '<pre class="repo-card__codeblock repo-card__codeblock--plantuml">' + esc(d.diagrams.plantUmlCode || '') + '</pre>' +
        '</div>' +
        '<div class="repo-card__diagram-pane is-hidden" data-diagram-pane="specs">' +
          '<div class="repo-card__class-grid">' + renderClassRows(d.diagrams.classes) + '</div>' +
        '</div>' +
      '</section>' +
      '<section class="repo-card__section">' +
        '<h4 class="repo-card__section-title">Language Composition &amp; Tech Stack</h4>' +
        '<div class="repo-card__language-list">' + renderLanguageRows(d.languages) + '</div>' +
        '<div class="repo-card__tags">' +
          '<span class="repo-card__tag">Primary: ' + esc(d.repo.primaryLanguage) + '</span>' +
          '<span class="repo-card__tag">License: ' + esc(d.repo.license) + '</span>' +
          '<span class="repo-card__tag">Branch: ' + esc(d.repo.defaultBranch) + '</span>' +
        '</div>' +
      '</section>' +
      '<section class="repo-card__section">' +
        '<h4 class="repo-card__section-title">Repository Structure (' + esc(d.repo.defaultBranch) + ')</h4>' +
        '<pre class="repo-card__tree">' + esc(renderTree(d.treePaths)) + '</pre>' +
      '</section>' +
      '<div class="repo-card__tags">' +
        (d.repo.topics || []).slice(0, 12).map(function (topic) { return '<span class="repo-card__tag">#' + esc(topic) + '</span>'; }).join('') +
      '</div>';
    bindDiagramUi(el, d);
  }

  function renderRepoCard(repoSlug, selector) {
    var el = document.querySelector(selector || '#repo-card');
    if (!el) return;
    renderCard(el, REPO_DATA);

    fetch('https://api.github.com/repos/' + encodeURIComponent(repoSlug))
      .then(function (res) {
        if (!res.ok) throw new Error('GitHub API error ' + res.status);
        return res.json();
      })
      .then(function (r) {
        var merged = JSON.parse(JSON.stringify(REPO_DATA));
        merged.repo.fullName = r.full_name || merged.repo.fullName || repoSlug;
        merged.repo.name = r.name || merged.repo.name;
        merged.repo.htmlUrl = r.html_url || merged.repo.htmlUrl;
        merged.repo.description = r.description || merged.repo.description;
        merged.repo.owner = (r.owner && r.owner.login) || merged.repo.owner;
        merged.repo.ownerAvatarUrl = (r.owner && r.owner.avatar_url) || merged.repo.ownerAvatarUrl;
        merged.repo.primaryLanguage = r.language || merged.repo.primaryLanguage;
        merged.repo.stars = r.stargazers_count || 0;
        merged.repo.forks = r.forks_count || 0;
        merged.repo.openIssues = r.open_issues_count || 0;
        renderCard(el, merged);
      })
      .catch(function (err) {
        console.warn('[repo-showcase-card] Could not fetch live data:', err);
      });
  }

  document.querySelectorAll('[data-repo]').forEach(function (el) {
    renderRepoCard(el.getAttribute('data-repo'), null);
    el.id = el.id || 'repo-card';
  });

  var defaultEl = document.getElementById('repo-card');
  if (defaultEl && !defaultEl.getAttribute('data-repo')) {
    renderCard(defaultEl, REPO_DATA);
  }

  window.RepoCard = { render: renderRepoCard };
}());`;
  };

  const getCombinedCode = () => {
    const css = getCssCode();
    const js = getJsCode();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(repo.full_name)} — Repository Card</title>
  <style>
/* ── Reset ────────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #020617;
  padding: 32px 16px;
}

${css}
  </style>
</head>
<body>

  <!--
    GitHub Repository Card — Self-contained embed
    ─────────────────────────────────────────────
    • Copy this entire file and open it in any browser, or paste the
      <div> and the <style>/<script> blocks into your own page.
    • To display a different repo, change data-repo below.
    • Live data is fetched from the GitHub API automatically.
  -->
  <div id="repo-card" data-repo="${escAttr(repo.full_name)}"></div>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
${js}
  </script>

</body>
</html>`;
  };

  const getCurrentSnippet = (): string => {
    switch (embedType) {
      case 'iframe':      return getIframeCode();
      case 'react':       return getReactCode();
      case 'tailwind':    return getTailwindCode();
      case 'markdown':    return getMarkdownCode();
      case 'html':        return getHtmlCode();
      case 'css':         return getCssCode();
      case 'javascript':  return getJsCode();
      case 'combined':    return getCombinedCode();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tab group definitions to keep the UI organised
  const tabs: { id: EmbedType; label: string }[] = [
    { id: 'combined',   label: 'Combined (HTML + CSS + JS)' },
    { id: 'html',       label: 'HTML' },
    { id: 'css',        label: 'CSS' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'tailwind',   label: 'HTML / Tailwind' },
    { id: 'react',      label: 'React (JSX)' },
    { id: 'iframe',     label: 'iFrame' },
    { id: 'markdown',   label: 'Markdown Badges' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Embed &amp; Export Code Snippet
            </h3>
            <p className="text-xs text-slate-400">
              Copy production-ready code to present this repository on your website or portfolio.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Snippet</span>
            </>
          )}
        </button>
      </div>

      {/* Snippet Format Selector */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setEmbedType(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
              embedType === tab.id
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mode description hints */}
      {embedType === 'html' && (
        <p className="text-xs text-slate-500">
          Semantic HTML markup for the card. Pair with the <strong className="text-slate-400">CSS</strong> and <strong className="text-slate-400">JavaScript</strong> exports, or use the <strong className="text-slate-400">Combined</strong> export for a single self-contained file.
        </p>
      )}
      {embedType === 'css' && (
        <p className="text-xs text-slate-500">
          Standalone stylesheet for the card. Save as <code className="text-slate-400">repo-card.css</code> and link it from your page.
        </p>
      )}
      {embedType === 'javascript' && (
        <p className="text-xs text-slate-500">
          Vanilla JS widget. Renders the card with baked-in data and optionally fetches live stats from the GitHub API. Save as <code className="text-slate-400">repo-card.js</code>.
        </p>
      )}
      {embedType === 'combined' && (
        <p className="text-xs text-slate-500">
          A fully self-contained HTML page — includes inline CSS and JS. Open it directly in a browser or paste the relevant blocks into your own page. No build tools, no framework, no CDN required.
        </p>
      )}

      {/* Code Display Area */}
      <div className="relative">
        <pre className="font-mono text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800/80 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {getCurrentSnippet()}
        </pre>
      </div>
    </div>
  );
};
