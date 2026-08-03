import React, { useState } from 'react';
import { Sparkles, Layout, Code2, BookOpen, BarChart2, Share2, ShieldCheck, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export const BestPracticesGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const pillars = [
    {
      icon: <Layout className="w-5 h-5 text-indigo-500" />,
      title: "1. High-Impact Executive Hero Card",
      description: "Present the repo name, concise description, primary tech stack badge, live star count ⭐, fork count 🍴, and quick action buttons (View on GitHub, Clone URL, Demo Link).",
      keyRule: "Keep the hero card self-contained with immediate visual clarity above the fold."
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-emerald-500" />,
      title: "2. Visual Tech Stack & Language Bar",
      description: "Display an exact language breakdown bar (e.g. TypeScript 72%, Rust 20%) alongside categorized topics and tags so developers instantly understand the ecosystem.",
      keyRule: "Use official language colors and clickable topic tags."
    },
    {
      icon: <BookOpen className="w-5 h-5 text-amber-500" />,
      title: "3. Formatted & Rendered README",
      description: "Don't just plain-text dump the README. Render Markdown cleanly with styled code blocks, readable typography, tables, and an interactive Table of Contents.",
      keyRule: "Support a Table of Contents sidebar for long technical documentation."
    },
    {
      icon: <Code2 className="w-5 h-5 text-cyan-500" />,
      title: "4. Interactive File Tree & Core Code Preview",
      description: "Give visitors a peek inside without leaving your page! Highlight key directories (`src`, `packages`) and core config files (`package.json`, `Cargo.toml`).",
      keyRule: "Enable quick previewing of root files and project entry points."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-purple-500" />,
      title: "5. Releases, Health & Community Pulse",
      description: "Show latest release notes, last commit date, open issues status, license badge (MIT/Apache), and top contributor avatars.",
      keyRule: "Proves that the repository is actively maintained and trustworthy."
    },
    {
      icon: <Share2 className="w-5 h-5 text-rose-500" />,
      title: "6. Multi-Platform Embed & Export Options",
      description: "Provide clean HTML, React Component, or Tailwind snippets so the showcase card can be easily embedded into portfolio sites, blogs, or landing pages.",
      keyRule: "Make cards responsive and zero-dependency embeddable."
    }
  ];

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 transition-all">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-100">
                The 6 Principles of Presenting a GitHub Repository on a Web Page
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                Best Practice Guide
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click to {isOpen ? 'hide' : 'explore'} key design patterns, UX rules, and embed strategies.
            </p>
          </div>
        </div>
        <button 
          aria-label="Toggle Guide"
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        >
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            When embedding or showcasing a GitHub repository on your personal portfolio, blog, documentation, or product landing page, a standard plain link or simple iframe is often unengaging. The best repository presentations combine <strong className="text-white">real-time GitHub API metadata</strong>, <strong className="text-white">clean typography</strong>, and <strong className="text-white">interactive previews</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {pillars.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 hover:border-indigo-500/30 transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {item.description}
                </p>
                <div className="flex items-start gap-1.5 text-[11px] font-medium text-indigo-400/90 bg-indigo-950/30 px-2.5 py-1.5 rounded-md border border-indigo-900/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{item.keyRule}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
