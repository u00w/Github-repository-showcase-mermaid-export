import React, { useState } from 'react';
import { FullRepoResponse, ThemeStyle } from '../types';
import { Code2, Copy, Check, Share2, Layers, ShieldCheck, Terminal, FileCode, FileType, Braces, Package } from 'lucide-react';
import { generateDefaultUmlDiagram } from '../utils/umlGenerator';

interface EmbedCodeGeneratorProps {
  data: FullRepoResponse;
  activeTheme: ThemeStyle;
}

type EmbedType = 'iframe' | 'react' | 'tailwind' | 'markdown' | 'html' | 'css' | 'javascript' | 'combined' | 'hybrid';

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

interface TreeNode {
  name: string;
  isFile: boolean;
  children: Map<string, TreeNode>;
}

function formatNestedTree(paths: string[]): string[] {
  const root = new Map<string, TreeNode>();

  for (const rawPath of paths) {
    const parts = rawPath.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    let cursor = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existing = cursor.get(part);
      if (!existing) {
        cursor.set(part, { name: part, isFile, children: new Map<string, TreeNode>() });
      } else if (isFile) {
        existing.isFile = true;
      }
      cursor = cursor.get(part)!.children;
    }
  }

  const lines: string[] = [];

  const walk = (nodes: Map<string, TreeNode>, prefix: string) => {
    const entries = Array.from(nodes.values()).sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    entries.forEach((node, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└─' : '├─';
      lines.push(`${prefix}${connector} ${node.name}${node.isFile ? '' : '/'}`);
      if (node.children.size > 0) {
        walk(node.children, `${prefix}${isLast ? '   ' : '│  '}`);
      }
    });
  };

  walk(root, '');
  return lines;
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
      .slice(0, 80);
    const treeLines = formatNestedTree(treePaths).slice(0, 120);
    const treeItems = data.tree
      .filter((item) => !item.path.startsWith('.'))
      .slice(0, 240)
      .map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size || 0,
        htmlUrl: item.html_url || '',
        downloadUrl: item.download_url || '',
      }));

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
      contributors: data.contributors.slice(0, 8).map((contributor) => ({
        login: contributor.login,
        avatarUrl: contributor.avatar_url,
        htmlUrl: contributor.html_url,
        contributions: contributor.contributions,
      })),
      treeItems,
      treePaths,
      treeLines,
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
  const [activeDiagram, setActiveDiagram] = useState('web');
  const [mermaidError, setMermaidError] = useState('');
  const mermaidContainerRef = useRef(null);

  useEffect(() => {
    if (activeDiagram !== 'mermaid') return;
    let cancelled = false;

    const renderMermaid = async () => {
      if (!mermaidContainerRef.current) return;
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
          View on GitHub
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
            <div ref={mermaidContainerRef} className="w-full overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 text-slate-100 p-2" />
          </div>
        )}

        {activeDiagram === 'web' && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300 space-y-3">
            {typeof renderWebArchitecture === 'function' ? (
              renderWebArchitecture({
                classes: data.diagrams.classes,
                relationships: data.diagrams.relationships,
              })
            ) : (
              <div className="space-y-2">
                <p className="text-slate-200 font-medium">Interactive node map</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.diagrams.classes.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="text-left px-2.5 py-2 rounded-md border border-slate-700 bg-slate-950/60 hover:border-indigo-500 hover:bg-slate-900 transition"
                    >
                      <p className="text-slate-100 font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.stereotype || 'class'} • {item.packageName || 'root'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
{data.treeLines.join('\\n')}
        </pre>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-white">Top Contributors</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {data.contributors.map((contributor) => (
            <a
              key={contributor.login}
              href={contributor.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-2 hover:border-indigo-500 transition"
            >
              <img src={contributor.avatarUrl} alt={contributor.login} className="w-7 h-7 rounded-full border border-slate-700" />
              <div className="min-w-0">
                <p className="text-xs text-slate-100 truncate">{contributor.login}</p>
                <p className="text-[11px] text-slate-400">{contributor.contributions} contributions</p>
              </div>
            </a>
          ))}
        </div>
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
    const treeRows = cardData.treeLines.map((path) => escHtml(path)).join('\n');
    const contributorRows = cardData.contributors.map((contributor) => `<a href="${escAttr(contributor.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-2 hover:border-indigo-500 transition">
  <img src="${escAttr(contributor.avatarUrl)}" alt="${escAttr(contributor.login)}" class="w-7 h-7 rounded-full border border-slate-700" />
  <div class="min-w-0">
    <p class="text-xs text-slate-100 truncate">${escHtml(contributor.login)}</p>
    <p class="text-[11px] text-slate-400">${Number(contributor.contributions).toLocaleString()} contributions</p>
  </div>
</a>`).join('\n');
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
    <a href="${escAttr(cardData.repo.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold">View on GitHub</a>
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
  <section class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
    <h4 class="text-sm font-semibold text-white">Top Contributors</h4>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">${contributorRows}</div>
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
  - architecture diagram tabs (Mermaid / Interactive Web)
       - Language Composition & Tech Stack
  - Repository Structure (categorized by nested folders)
  - Top Contributors -->
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
.repo-card__top-links { display: flex; justify-content: flex-end; }
.repo-card__top-link { color: #93c5fd; font-size: 11px; text-decoration: none; }
.repo-card__top-link:hover { color: #bfdbfe; }
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
.repo-card__diagram-mermaid { overflow-x: auto; background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 8px; }
.repo-card__web-diagram { width: 100%; overflow-x: auto; }
.repo-card__web-shell { border: 1px solid #334155; border-radius: 10px; background: rgba(2, 6, 23, 0.75); overflow: hidden; }
.repo-card__web-legend { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #1e293b; font-size: 10px; color: #94a3b8; }
.repo-card__web-legend-dot { width: 8px; height: 8px; border-radius: 999px; background: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
.repo-card__web-frame { width: 100%; overflow-x: auto; }
.repo-card__web-canvas { position: relative; width: 1240px; }
.repo-card__web-lanes { position: absolute; left: 0; right: 0; top: 6px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 0 20px; text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; z-index: 3; }
.repo-card__web-svg { position: absolute; inset: 0; width: 1240px; pointer-events: none; z-index: 1; }
.repo-card__web-node { position: absolute; width: 208px; transform: translate(-50%, -50%); border-radius: 10px; border: 1px solid rgba(129, 140, 248, 0.35); background: rgba(15, 23, 42, 0.95); box-shadow: 0 8px 20px rgba(2, 6, 23, 0.45); color: #e2e8f0; text-decoration: none; overflow: hidden; z-index: 2; transition: border-color 0.15s ease, background 0.15s ease; }
.repo-card__web-node:hover { border-color: rgba(129, 140, 248, 0.75); background: rgba(30, 41, 59, 0.95); z-index: 4; }
.repo-card__web-node-stereo { margin: 0; padding: 8px 10px 0; font-size: 9px; text-transform: uppercase; letter-spacing: 0.09em; color: #a5b4fc; }
.repo-card__web-node-title { display: flex; align-items: center; gap: 6px; margin-top: 4px; padding: 8px 10px; border-top: 1px solid rgba(71, 85, 105, 0.8); border-bottom: 1px solid rgba(71, 85, 105, 0.8); }
.repo-card__web-node-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; font-weight: 700; color: #e0e7ff; }
.repo-card__web-node-link { font-size: 10px; color: #64748b; }
.repo-card__web-node-members { padding: 8px 10px 10px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 9px; line-height: 1.35; color: #cbd5e1; display: grid; gap: 2px; }
.repo-card__web-node-member { margin: 0; word-break: break-word; }
.repo-card__diagram-error { margin: 0 0 8px; color: #fecdd3; font-size: 11px; }
.repo-card__language-list { display: flex; flex-direction: column; gap: 8px; }
.repo-card__language-row { display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-bottom: 4px; }
.repo-card__bar { height: 8px; border-radius: 999px; background: #1e293b; overflow: hidden; }
.repo-card__bar-fill { height: 100%; background: #6366f1; }
.repo-card__tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.repo-card__tag { border: 1px solid #334155; background: #0b1220; border-radius: 8px; padding: 4px 8px; font-size: 11px; color: #cbd5e1; }
.repo-card__tree { margin: 0; white-space: pre; overflow-x: auto; font-size: 11px; line-height: 1.5; color: #cbd5e1; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
.repo-card__contributors { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.repo-card__contributor { display: flex; align-items: center; gap: 8px; border: 1px solid #1e293b; border-radius: 8px; background: #0b1220; padding: 8px; text-decoration: none; }
.repo-card__contributor:hover { border-color: #4f46e5; }
.repo-card__contributor-avatar { width: 28px; height: 28px; border-radius: 999px; border: 1px solid #334155; }
.repo-card__contributor-meta { min-width: 0; }
.repo-card__contributor-name { margin: 0; color: #f1f5f9; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.repo-card__contributor-count { margin: 2px 0 0; color: #94a3b8; font-size: 11px; }
.repo-card__placeholder { margin: 0; color: #cbd5e1; font-size: 12px; }
@media (max-width: 720px) {
  .repo-card__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .repo-card__contributors { grid-template-columns: 1fr; }
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
.repo-card--light .repo-card__contributor-name { color: #0f172a; }
.repo-card--light .repo-card__owner,
.repo-card--light .repo-card__contributor-count,
.repo-card--light .repo-card__language-row { color: #64748b; }
.repo-card--light .repo-card__diagram-mermaid { border: 1px solid #cbd5e1; }
.repo-card--light .repo-card__web-shell { background: #f8fafc; border-color: #cbd5e1; }
.repo-card--light .repo-card__web-legend { border-color: #e2e8f0; color: #64748b; }
.repo-card--light .repo-card__web-lanes { color: #94a3b8; }
.repo-card--light .repo-card__web-node { background: #ffffff; border-color: rgba(99, 102, 241, 0.35); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08); }
.repo-card--light .repo-card__web-node:hover { background: #f8fafc; }
.repo-card--light .repo-card__web-node-stereo { color: #4f46e5; }
.repo-card--light .repo-card__web-node-name { color: #1e293b; }
.repo-card--light .repo-card__web-node-link { color: #64748b; }
.repo-card--light .repo-card__web-node-members { color: #334155; }
.repo-card--light .repo-card__tree { color: #334155; }
.repo-card--light .repo-card__contributor { background: #f8fafc; border-color: #cbd5e1; }
.repo-card--light .repo-card__top-link { color: #1d4ed8; }
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

  function renderTree(paths) {
    var root = {};
    (paths || []).forEach(function (path) {
      var parts = String(path).split('/').filter(Boolean);
      if (!parts.length) return;
      var cursor = root;
      parts.forEach(function (part, index) {
        if (!cursor[part]) cursor[part] = { children: {}, isFile: false };
        if (index === parts.length - 1) cursor[part].isFile = true;
        cursor = cursor[part].children;
      });
    });

    var lines = [];
    function walk(nodes, prefix) {
      var names = Object.keys(nodes).sort(function (a, b) {
        var aIsFile = !!nodes[a].isFile;
        var bIsFile = !!nodes[b].isFile;
        if (aIsFile !== bIsFile) return aIsFile ? 1 : -1;
        return a.localeCompare(b);
      });
      names.forEach(function (name, idx) {
        var isLast = idx === names.length - 1;
        var connector = isLast ? '└─' : '├─';
        var node = nodes[name];
        lines.push(prefix + connector + ' ' + name + (node.isFile ? '' : '/'));
        if (Object.keys(node.children).length) {
          walk(node.children, prefix + (isLast ? '   ' : '│  '));
        }
      });
    }

    walk(root, '');
    return lines.join('\\n');
  }

  function renderContributors(contributors) {
    return (contributors || []).map(function (item) {
      return '<a class="repo-card__contributor" href="' + esc(item.htmlUrl) + '" target="_blank" rel="noopener noreferrer">' +
        '<img class="repo-card__contributor-avatar" src="' + esc(item.avatarUrl) + '" alt="' + esc(item.login) + '" />' +
        '<div class="repo-card__contributor-meta">' +
          '<p class="repo-card__contributor-name">' + esc(item.login) + '</p>' +
          '<p class="repo-card__contributor-count">' + fmtNum(item.contributions || 0) + ' contributions</p>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  function renderWebArchitecture(el, data) {
    var container = el.querySelector('[data-web-container]');
    if (!container) return;

    var classes = (data.diagrams && data.diagrams.classes ? data.diagrams.classes : []).slice(0, 14);
    var relationships = data.diagrams && data.diagrams.relationships ? data.diagrams.relationships : [];

    if (!classes.length) {
      container.innerHTML = '<p class="repo-card__placeholder">No architecture classes available.</p>';
      return;
    }

    var groups = [
      { name: 'Input & menus', match: /menu|ui|input|hud|screen|panel|button|view|camera/i },
      { name: 'Managers & systems', match: /manager|controller|game|simulation|service|system|state/i },
      { name: 'World & roads', match: /road|world|map|terrain|vehicle|traffic|path|location/i },
      { name: 'Data & support', match: /model|data|config|repository|save|event|player/i },
    ];
    var laneX = [0.12, 0.38, 0.64, 0.88];
    var nodeWidth = 208;
    var canvasWidth = 1240;

    function estimateHeight(cls) {
      var memberLines = (cls.attributes || []).length + (cls.methods || []).length;
      return Math.max(82, 54 + memberLines * 12);
    }

    function groupIndex(cls) {
      var descriptor = [cls.name, cls.packageName || '', cls.stereotype || ''].join(' ');
      for (var i = 0; i < groups.length; i += 1) {
        if (groups[i].match.test(descriptor)) return i;
      }
      return groups.length - 1;
    }

    function relationStyle(rel) {
      var name = String(rel.label || rel.type || '').toLowerCase();
      if (name.indexOf('uses') >= 0) return { color: '#facc15', bg: '#422006', border: '#facc15' };
      if (name.indexOf('manages') >= 0) return { color: '#4ade80', bg: '#052e16', border: '#4ade80' };
      if (name.indexOf('reads') >= 0) return { color: '#c084fc', bg: '#3b0764', border: '#c084fc' };
      return { color: '#818cf8', bg: '#0f172a', border: '#475569' };
    }

    function orthPath(from, to, routeIndex) {
      var leftToRight = to.x >= from.x;
      var startX = from.x + (leftToRight ? nodeWidth / 2 : -nodeWidth / 2);
      var endX = to.x + (leftToRight ? -nodeWidth / 2 : nodeWidth / 2);
      var startY = from.y + ((routeIndex % 7) - 3) * 4;
      var endY = to.y + (((routeIndex * 3) % 7) - 3) * 4;
      var dir = leftToRight ? 1 : -1;
      var requested = 44 + (routeIndex % 7) * 18;
      var available = Math.max(26, Math.abs(endX - startX) / 2 - 12);
      var midX = startX + dir * Math.min(requested, available);
      var vertDir = endY >= startY ? 1 : -1;
      var radius = Math.min(12, Math.abs(endY - startY) / 2, Math.abs(endX - startX) / 4);
      var beforeTurn = midX - dir * radius;
      var afterTurn = midX + dir * radius;
      return {
        d: [
          'M ' + startX + ' ' + startY,
          'H ' + beforeTurn,
          'Q ' + midX + ' ' + startY + ' ' + midX + ' ' + (startY + vertDir * radius),
          'V ' + (endY - vertDir * radius),
          'Q ' + midX + ' ' + endY + ' ' + afterTurn + ' ' + endY,
          'H ' + endX,
        ].join(' '),
        labelX: midX + dir * 5,
        labelY: (startY + endY) / 2 - 7,
      };
    }

    var lanes = [[], [], [], []];
    classes.forEach(function (cls) {
      lanes[groupIndex(cls)].push(cls);
    });

    var positions = {};
    var maxY = 640;
    lanes.forEach(function (lane, idx) {
      var y = 64;
      lane.forEach(function (cls) {
        var h = estimateHeight(cls);
        positions[cls.id] = { x: laneX[idx] * canvasWidth, y: y + h / 2, height: h };
        y += h + 30;
      });
      maxY = Math.max(maxY, y + 50);
    });

    var links = relationships
      .filter(function (rel) { return positions[rel.fromId] && positions[rel.toId]; })
      .map(function (rel, idx) {
        var route = orthPath(positions[rel.fromId], positions[rel.toId], idx);
        var style = relationStyle(rel);
        var label = esc(rel.label || rel.type || 'relation');
        var dashed = rel.type === 'dependency' || rel.type === 'realization';
        var boxW = label.length * 5.8 + 12;
        return '<g>' +
          '<path d="' + route.d + '" fill="none" stroke="#020617" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path>' +
          '<path d="' + route.d + '" fill="none" stroke="' + style.color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"' + (dashed ? ' stroke-dasharray="5 4"' : '') + ' marker-end="url(#repo-card-arch-arrow)"></path>' +
          '<rect x="' + (route.labelX - boxW / 2) + '" y="' + (route.labelY - 7) + '" width="' + boxW + '" height="14" rx="4" fill="' + style.bg + '" stroke="' + style.border + '"></rect>' +
          '<text x="' + route.labelX + '" y="' + route.labelY + '" text-anchor="middle" dominant-baseline="middle" fill="#e2e8f0" font-size="9">' + label + '</text>' +
        '</g>';
      })
      .join('');

    var cards = classes.map(function (cls) {
      var pos = positions[cls.id];
      var members = [];
      (cls.attributes || []).forEach(function (a) { members.push('<p class="repo-card__web-node-member">' + esc(a) + '</p>'); });
      (cls.methods || []).forEach(function (m) { members.push('<p class="repo-card__web-node-member">' + esc(m) + '</p>'); });
      var href = 'https://github.com/' + data.repo.fullName + '/search?q=' + encodeURIComponent(cls.name) + '&type=code';
      return '<a class="repo-card__web-node" href="' + href + '" target="_blank" rel="noopener noreferrer" title="Find ' + esc(cls.name) + ' in this repository on GitHub" style="left:' + pos.x + 'px;top:' + pos.y + 'px;height:' + pos.height + 'px;">' +
        '<p class="repo-card__web-node-stereo">«' + esc(cls.stereotype || 'class') + '»</p>' +
        '<div class="repo-card__web-node-title"><span class="repo-card__web-node-name">' + esc(cls.name) + '</span><span class="repo-card__web-node-link">↗</span></div>' +
        (members.length ? '<div class="repo-card__web-node-members">' + members.join('') + '</div>' : '') +
      '</a>';
    }).join('');

    container.innerHTML =
      '<div class="repo-card__web-shell">' +
        '<div class="repo-card__web-legend"><span class="repo-card__web-legend-dot"></span><span>Modules are clustered by concern, with labeled UML relationships between lanes.</span></div>' +
        '<div class="repo-card__web-frame">' +
          '<div class="repo-card__web-canvas" style="height:' + maxY + 'px;">' +
            '<div class="repo-card__web-lanes">' + groups.map(function (g) { return '<span>' + esc(g.name) + '</span>'; }).join('') + '</div>' +
            '<svg class="repo-card__web-svg" width="' + canvasWidth + '" height="' + maxY + '" aria-hidden="true">' +
              '<defs><marker id="repo-card-arch-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="context-stroke"></path></marker></defs>' +
              links +
            '</svg>' +
            cards +
          '</div>' +
        '</div>' +
      '</div>';
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
      if (tab === 'web') renderWebArchitecture(el, data);
    }
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { setActive(btn.getAttribute('data-diagram-tab')); });
    });
    setActive('web');
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
      window.mermaid.initialize({
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
      '<div class="repo-card__top-links">' +
        '<a class="repo-card__top-link" href="' + esc(d.repo.htmlUrl) + '" target="_blank" rel="noopener noreferrer">View on GitHub</a>' +
      '</div>' +
      '<div class="repo-card__header">' +
        '<div class="repo-card__owner-group">' +
          '<img class="repo-card__avatar" src="' + esc(d.repo.ownerAvatarUrl) + '" alt="' + esc(d.repo.owner) + '" />' +
          '<div class="repo-card__meta">' +
            '<a class="repo-card__name" href="' + esc(d.repo.htmlUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(d.repo.fullName) + '</a>' +
            '<span class="repo-card__owner">' + esc(d.repo.owner) + '</span>' +
          '</div>' +
        '</div>' +
        '<a class="repo-card__btn" href="' + esc(d.repo.htmlUrl) + '" target="_blank" rel="noopener noreferrer">Open Repository</a>' +
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
        '</div>' +
        '<div class="repo-card__diagram-pane" data-diagram-pane="mermaid">' +
          '<p class="repo-card__diagram-error" data-mermaid-error></p>' +
          '<div class="repo-card__diagram-mermaid" data-mermaid-container></div>' +
        '</div>' +
        '<div class="repo-card__diagram-pane is-hidden" data-diagram-pane="web">' +
          '<div class="repo-card__web-diagram" data-web-container></div>' +
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
        '<pre class="repo-card__tree">' + esc((d.treeLines && d.treeLines.length ? d.treeLines.join('\\n') : renderTree(d.treePaths))) + '</pre>' +
      '</section>' +
      '<section class="repo-card__section">' +
        '<h4 class="repo-card__section-title">Top Contributors</h4>' +
        '<div class="repo-card__contributors">' + renderContributors(d.contributors) + '</div>' +
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

  const getHybridCode = () => {
    const hybridData = getExportCardData();
    const serializedData = JSON.stringify(hybridData, null, 2);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(repo.full_name)} — Hybrid Repository Card</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="min-h-screen bg-slate-950 p-6">
  <div id="repo-hybrid-card"></div>

  <script type="text/babel">
    const { useEffect, useLayoutEffect, useMemo, useRef, useState } = React;
    const data = ${serializedData};

    const GROUPS = [
      { name: 'Input & menus', match: /menu|ui|input|hud|screen|panel|button|view|camera/i },
      { name: 'Managers & systems', match: /manager|controller|game|simulation|service|system|state/i },
      { name: 'World & roads', match: /road|world|map|terrain|vehicle|traffic|path|location/i },
      { name: 'Data & support', match: /model|data|config|repository|save|event|player/i },
    ];
    const GROUP_X_POSITIONS = [0.08, 0.36, 0.64, 0.92];

    const getGroupIndex = (umlClass) => {
      const descriptor = umlClass.name + ' ' + (umlClass.packageName || '') + ' ' + (umlClass.stereotype || '');
      return GROUPS.findIndex((group) => group.match.test(descriptor));
    };

    const estimateNodeHeight = (umlClass) => {
      const members = [...(umlClass.attributes || []), ...(umlClass.methods || [])];
      const textLines = members.reduce((total, member) => total + Math.max(1, Math.ceil(String(member).length / 27)), 0);
      return 58 + textLines * 15;
    };

    const getClusteredLayout = (classes) => {
      const clusters = GROUPS.map(() => []);
      const other = [];
      classes.forEach((umlClass) => {
        const index = getGroupIndex(umlClass);
        if (index === -1) other.push(umlClass);
        else clusters[index].push(umlClass);
      });

      clusters[3].push(...other);
      const tallestCluster = Math.max(...clusters.map((cluster) => cluster.reduce((total, umlClass) => total + estimateNodeHeight(umlClass) + 30, 0)));
      const canvasHeight = Math.max(640, tallestCluster + 110);
      const positions = {};

      clusters.forEach((cluster, groupIndex) => {
        let cursorY = 64;
        cluster.forEach((umlClass) => {
          const nodeHeight = estimateNodeHeight(umlClass);
          positions[umlClass.id] = {
            x: GROUP_X_POSITIONS[groupIndex],
            y: cursorY + nodeHeight / 2,
          };
          cursorY += nodeHeight + 30;
        });
      });

      return { positions, canvasHeight };
    };

    const getRelationStyle = (relationship) => {
      const name = String(relationship.label || relationship.type).toLowerCase();
      if (name.includes('uses')) return { color: '#facc15', labelBackground: '#422006', labelBorder: '#facc15' };
      if (name.includes('manages')) return { color: '#4ade80', labelBackground: '#052e16', labelBorder: '#4ade80' };
      if (name.includes('reads')) return { color: '#c084fc', labelBackground: '#3b0764', labelBorder: '#c084fc' };
      return { color: '#818cf8', labelBackground: '#0f172a', labelBorder: '#475569' };
    };

    const createOrthogonalPath = (source, target, routeIndex) => {
      const sourceCenter = { x: source.x, y: source.y };
      const targetCenter = { x: target.x, y: target.y };
      const sourcePortOffset = ((routeIndex % 7) - 3) * 5;
      const targetPortOffset = (((routeIndex * 3) % 7) - 3) * 5;
      const isSameLane = Math.abs(targetCenter.x - sourceCenter.x) < 30;
      const leftToRight = isSameLane ? routeIndex % 2 === 0 : targetCenter.x >= sourceCenter.x;
      const start = {
        x: sourceCenter.x + (leftToRight ? source.width / 2 : -source.width / 2),
        y: sourceCenter.y + sourcePortOffset,
      };
      const end = {
        x: targetCenter.x + (leftToRight ? -target.width / 2 : target.width / 2),
        y: targetCenter.y + targetPortOffset,
      };

      const horizontalDirection = leftToRight ? 1 : -1;
      const requestedLaneDistance = 44 + (routeIndex % 7) * 20;
      const availableLaneDistance = Math.max(28, Math.abs(end.x - start.x) / 2 - 14);
      const midX = start.x + horizontalDirection * Math.min(requestedLaneDistance, availableLaneDistance);
      const verticalDirection = end.y >= start.y ? 1 : -1;
      const radius = Math.min(12, Math.abs(end.y - start.y) / 2, Math.abs(end.x - start.x) / 4);
      const beforeTurn = midX - horizontalDirection * radius;
      const afterTurn = midX + horizontalDirection * radius;

      return {
        path: [
          'M ' + start.x + ' ' + start.y,
          'H ' + beforeTurn,
          'Q ' + midX + ' ' + start.y + ' ' + midX + ' ' + (start.y + verticalDirection * radius),
          'V ' + (end.y - verticalDirection * radius),
          'Q ' + midX + ' ' + end.y + ' ' + afterTurn + ' ' + end.y,
          'H ' + end.x,
        ].join(' '),
        labelX: midX + horizontalDirection * 5,
        labelY: (start.y + end.y) / 2 - 7,
      };
    };

    const sortNodes = (nodes) => nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });

    const createFileHierarchy = (items) => {
      const root = [];

      items.forEach((item) => {
        const segments = String(item.path || '').split('/').filter(Boolean);
        let currentLevel = root;
        let currentPath = '';

        segments.forEach((segment, index) => {
          currentPath = currentPath ? currentPath + '/' + segment : segment;
          const isLeaf = index === segments.length - 1;
          let node = currentLevel.find((candidate) => candidate.name === segment);

          if (!node) {
            node = isLeaf
              ? { ...item, name: segment, path: currentPath, children: [] }
              : { name: segment, path: currentPath, type: 'dir', children: [] };
            currentLevel.push(node);
          }

          if (!isLeaf) currentLevel = node.children;
        });
      });

      const sortRecursively = (nodes) => {
        sortNodes(nodes).forEach((node) => sortRecursively(node.children || []));
      };

      sortRecursively(root);
      return root;
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return '-';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    function HybridFileExplorer({ treeItems, repoFullName, defaultBranch }) {
      const [expandedFolders, setExpandedFolders] = useState(new Set());
      const hierarchy = useMemo(() => createFileHierarchy(treeItems || []), [treeItems]);

      useEffect(() => {
        setExpandedFolders(new Set());
      }, [repoFullName, defaultBranch]);

      const toggleFolder = (path) => {
        setExpandedFolders((current) => {
          const next = new Set(current);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      };

      const renderNode = (node, depth = 0) => {
        const isFolder = node.type === 'dir';
        const isExpanded = expandedFolders.has(node.path);
        const githubUrl = isFolder
          ? 'https://github.com/' + repoFullName + '/tree/' + defaultBranch + '/' + node.path
          : (node.htmlUrl || 'https://github.com/' + repoFullName + '/blob/' + defaultBranch + '/' + node.path);

        return (
          <React.Fragment key={node.path}>
            <div
              className="flex items-center justify-between py-2 pr-2 hover:bg-slate-800/40 rounded-lg transition-colors group"
              style={{ paddingLeft: (depth * 16 + 8) + 'px' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isFolder ? (
                  <button
                    type="button"
                    onClick={() => toggleFolder(node.path)}
                    className="w-4 text-slate-400 hover:text-slate-100"
                    aria-expanded={isExpanded}
                    aria-label={(isExpanded ? 'Collapse ' : 'Expand ') + node.name}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="w-4 text-slate-500">·</span>
                )}
                <span className={isFolder ? 'text-amber-400' : 'text-slate-400'}>{isFolder ? '📁' : '📄'}</span>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={(isFolder ? 'text-slate-200 font-semibold' : 'text-slate-300') + ' truncate hover:underline'}
                >
                  {node.name}
                </a>
              </div>

              {!isFolder && (
                <div className="flex items-center gap-4 shrink-0 text-slate-500 text-[11px]">
                  <span>{formatFileSize(node.size)}</span>
                  {node.downloadUrl && (
                    <a
                      href={node.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 hover:text-indigo-400 transition-opacity"
                      title="Download file"
                    >
                      ⬇
                    </a>
                  )}
                </div>
              )}
            </div>

            {isFolder && isExpanded && (node.children || []).map((child) => renderNode(child, depth + 1))}
          </React.Fragment>
        );
      };

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-sm font-semibold text-slate-200">Repository Structure ({defaultBranch})</h4>
            <a
              href={'https://github.com/' + repoFullName + '/tree/' + defaultBranch}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:underline"
            >
              Browse full tree
            </a>
          </div>
          <div className="font-mono text-xs">
            {hierarchy.map((node) => renderNode(node))}
          </div>
        </div>
      );
    }

    function WebArchitectureDiagram({ classes, relationships, repoFullName, defaultBranch }) {
      const frameRef = useRef(null);
      const { positions, canvasHeight } = useMemo(() => getClusteredLayout(classes), [classes]);
      const [connections, setConnections] = useState([]);
      const [canvasSize, setCanvasSize] = useState({ width: 1280, height: canvasHeight });
      const [diagramScale, setDiagramScale] = useState(1);

      useLayoutEffect(() => {
        const updateScale = () => {
          const frame = frameRef.current;
          if (!frame) return;
          const availableHeight = Math.max(380, window.innerHeight * 0.78);
          setDiagramScale(Math.min(1, frame.clientWidth / 1280, availableHeight / canvasHeight));
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        if (frameRef.current) observer.observe(frameRef.current);
        window.addEventListener('resize', updateScale);
        return () => {
          observer.disconnect();
          window.removeEventListener('resize', updateScale);
        };
      }, [canvasHeight]);

      useLayoutEffect(() => {
        const nodeRectById = {};
        classes.forEach((umlClass) => {
          const pos = positions[umlClass.id];
          if (!pos) return;
          nodeRectById[umlClass.id] = {
            x: pos.x * 1280,
            y: pos.y,
            width: 208,
          };
        });

        setCanvasSize({ width: 1280, height: canvasHeight });
        setConnections(relationships.flatMap((relationship, index) => {
          const from = nodeRectById[relationship.fromId];
          const to = nodeRectById[relationship.toId];
          if (!from || !to) return [];
          const route = createOrthogonalPath(from, to, index);
          return [{
            id: relationship.id,
            path: route.path,
            labelX: route.labelX,
            labelY: route.labelY,
            label: relationship.label || relationship.type,
            dashed: relationship.type === 'dependency' || relationship.type === 'realization',
            ...getRelationStyle(relationship),
          }];
        }));
      }, [canvasHeight, classes, positions, relationships]);

      return (
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/70 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 text-[10px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
            <span>Hybrid React renderer. Branch: {defaultBranch}. Connectors and lanes match the in-app architecture logic.</span>
          </div>

          <div ref={frameRef} className="w-full overflow-hidden" style={{ height: canvasHeight * diagramScale }}>
            <div className="relative w-[1280px]" style={{ height: canvasHeight, transform: 'scale(' + diagramScale + ')', transformOrigin: 'top left' }}>
              <div className="absolute inset-x-0 top-2 grid grid-cols-4 px-4 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {GROUPS.map((group) => <span key={group.name}>{group.name}</span>)}
              </div>

              <svg className="absolute inset-0 pointer-events-none" width={canvasSize.width} height={canvasSize.height} aria-hidden="true">
                <defs>
                  <marker id="architecture-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="context-stroke" />
                  </marker>
                </defs>
                {connections.map((connection) => (
                  <g key={connection.id}>
                    <path d={connection.path} fill="none" stroke="#020617" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={connection.path} fill="none" stroke={connection.color} strokeWidth="1.5" strokeDasharray={connection.dashed ? '5 4' : undefined}
                      strokeLinecap="round" strokeLinejoin="round" opacity="0.8" markerEnd="url(#architecture-arrow)" />
                    <rect
                      x={connection.labelX - (String(connection.label).length * 2.9 + 5)}
                      y={connection.labelY - 7}
                      width={String(connection.label).length * 5.8 + 10}
                      height="14"
                      rx="4"
                      fill={connection.labelBackground}
                      stroke={connection.labelBorder}
                    />
                    <text x={connection.labelX} y={connection.labelY} textAnchor="middle" dominantBaseline="middle" className="fill-slate-100 text-[9px]">
                      {connection.label}
                    </text>
                  </g>
                ))}
              </svg>

              {classes.map((umlClass) => {
                const position = positions[umlClass.id];
                const members = [...(umlClass.attributes || []), ...(umlClass.methods || [])];
                return (
                  <a
                    key={umlClass.id}
                    href={'https://github.com/' + repoFullName + '/search?q=' + encodeURIComponent(umlClass.name) + '&type=code'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={'Find ' + umlClass.name + ' in this repository on GitHub'}
                    className="absolute z-10 w-52 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-indigo-400/30 bg-slate-900/95 shadow-md shadow-black/20 transition hover:z-20 hover:border-indigo-400/70 hover:bg-slate-800"
                    style={{ left: (position.x * 100) + '%', top: position.y + 'px' }}
                  >
                    <p className="px-2.5 pt-2 text-[9px] uppercase tracking-wider text-indigo-300">«{umlClass.stereotype || 'class'}»</p>
                    <div className="mt-1 flex items-center gap-1.5 border-y border-slate-700/80 px-2.5 py-1.5">
                      <span className="truncate text-xs font-bold text-indigo-100">{umlClass.name}</span>
                      <span className="text-slate-500 text-[10px]">↗</span>
                    </div>
                    {members.length > 0 && (
                      <div className="space-y-0.5 px-2.5 py-2 font-mono text-[9px] leading-[1.35] text-slate-300">
                        {members.map((line, idx) => <p key={idx} className="break-words">{line}</p>)}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    function RepoCard() {
      const [activeDiagram, setActiveDiagram] = useState('web');
      const [mermaidError, setMermaidError] = useState('');
      const mermaidContainerRef = useRef(null);

      useEffect(() => {
        if (activeDiagram !== 'mermaid') return;
        if (!mermaidContainerRef.current) return;
        setMermaidError('');

        if (!window.mermaid) {
          mermaidContainerRef.current.innerHTML = '<p class="text-xs text-slate-300">Mermaid runtime not available.</p>';
          return;
        }

        try {
          window.mermaid.initialize({
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
          const renderId = 'hybrid-mermaid-' + Math.random().toString(36).slice(2);
          window.mermaid.render(renderId, data.diagrams.mermaidCode).then((result) => {
            if (!mermaidContainerRef.current) return;
            mermaidContainerRef.current.innerHTML = result.svg;
            const svg = mermaidContainerRef.current.querySelector('svg');
            if (svg) {
              svg.style.width = '100%';
              svg.style.height = 'auto';
              svg.style.display = 'block';
            }
          }).catch((err) => {
            setMermaidError('Mermaid render failed: ' + (err && err.message ? err.message : 'unknown error'));
          });
        } catch (err) {
          setMermaidError('Mermaid render failed: ' + (err && err.message ? err.message : 'unknown error'));
        }
      }, [activeDiagram]);

      const totalLanguageBytes = data.languages.reduce((sum, item) => sum + item.bytes, 0);

      return (
        <main className="max-w-6xl mx-auto">
          <article className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-xl space-y-5">
            <div className="flex justify-end">
              <a href={data.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:text-blue-200">View on GitHub</a>
            </div>

            <header className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={data.repo.ownerAvatarUrl} alt={data.repo.owner} className="w-10 h-10 rounded-xl border border-slate-700" />
                <div>
                  <h2 className="font-bold text-base text-white">{data.repo.fullName}</h2>
                  <p className="text-xs text-slate-400">{data.repo.owner}</p>
                </div>
              </div>
              <a href={data.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold">Open Repository</a>
            </header>

            <p className="text-xs text-slate-300 leading-relaxed">{data.repo.description}</p>

            <div className="flex flex-wrap items-center gap-2">
              {(data.repo.topics || []).map((topic) => (
                <span key={topic} className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800 border border-slate-700 text-slate-300">#{topic}</span>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">⭐ {Number(data.repo.stars || 0).toLocaleString()}</div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">🍴 {Number(data.repo.forks || 0).toLocaleString()}</div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">🐞 {Number(data.repo.openIssues || 0).toLocaleString()}</div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-indigo-300">{data.repo.primaryLanguage}</div>
            </div>

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Architecture Diagrams</h3>
                <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 text-[11px]">
                  {[['mermaid', 'Mermaid'], ['web', 'Interactive Web']].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveDiagram(key)}
                      className={
                        'px-2.5 py-1 rounded-md transition ' +
                        (activeDiagram === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200')
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activeDiagram === 'mermaid' && (
                <div className="space-y-2">
                  {mermaidError && <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg p-2">{mermaidError}</p>}
                  <div ref={mermaidContainerRef} className="w-full overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 text-slate-100 p-2" />
                </div>
              )}

              {activeDiagram === 'web' && (
                <WebArchitectureDiagram
                  classes={data.diagrams.classes}
                  relationships={data.diagrams.relationships}
                  repoFullName={data.repo.fullName}
                  defaultBranch={data.repo.defaultBranch}
                />
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Language Composition &amp; Tech Stack</h3>
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
                        <div className="h-full bg-indigo-500" style={{ width: pct + '%' }} />
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
              <HybridFileExplorer
                treeItems={data.treeItems}
                repoFullName={data.repo.fullName}
                defaultBranch={data.repo.defaultBranch}
              />
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Top Contributors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(data.contributors || []).map((contributor) => (
                  <a
                    key={contributor.login}
                    href={contributor.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-2 hover:border-indigo-500 transition"
                  >
                    <img src={contributor.avatarUrl} alt={contributor.login} className="w-7 h-7 rounded-full border border-slate-700" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-100 truncate">{contributor.login}</p>
                      <p className="text-[11px] text-slate-400">{Number(contributor.contributions || 0).toLocaleString()} contributions</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </article>
        </main>
      );
    }

    ReactDOM.createRoot(document.getElementById('repo-hybrid-card')).render(<RepoCard />);
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
      case 'hybrid':      return getHybridCode();
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
    { id: 'hybrid',     label: 'Hybrid (React Widget)' },
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
      {embedType === 'hybrid' && (
        <p className="text-xs text-slate-500">
          Hybrid widget export: ships as HTML + JavaScript but runs the interactive diagram with a React runtime via CDN for behavior parity with the in-app architecture view.
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
