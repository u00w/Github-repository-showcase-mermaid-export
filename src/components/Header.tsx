import React, { useState, useEffect } from 'react';
import { Github, Search, Loader2, Code, FileText, Layers, Sparkles, ExternalLink, X } from 'lucide-react';
import { PresentationMode, ThemeStyle } from '../types';
import { FEATURED_REPOS } from '../data/featuredRepos';

interface HeaderProps {
  currentRepoInput: string;
  onSearch: (ownerAndRepo: string) => void;
  isLoading: boolean;
  activeMode: PresentationMode;
  onModeChange: (mode: PresentationMode) => void;
  activeTheme: ThemeStyle;
  onThemeChange: (theme: ThemeStyle) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRepoInput,
  onSearch,
  isLoading,
  activeMode,
  onModeChange,
  activeTheme,
  onThemeChange,
}) => {
  const [inputVal, setInputVal] = useState(currentRepoInput);

  useEffect(() => {
    setInputVal(currentRepoInput);
  }, [currentRepoInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  const handleSelectFeatured = (repoPath: string) => {
    setInputVal(repoPath);
    onSearch(repoPath);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Logo & Title & Wrapped Subtitle */}
        <div className="flex items-start gap-3 shrink-0 lg:max-w-xs">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 shrink-0 mt-0.5">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-100 text-base tracking-tight">
                GitHub Repo Presenter
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md shrink-0">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-normal mt-0.5">
              Showcase repositories with live API data, rendered READMEs & embed generators
            </p>
          </div>
        </div>

        {/* Search Input Bar (Spacious & Expanded) */}
        <div className="flex-1 max-w-2xl w-full flex flex-col sm:flex-row items-center gap-2">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Paste GitHub repository URL or owner/repo"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 shrink-0 min-w-[90px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                "Load Repo"
              )}
            </button>
          </form>

          {/* Quick Select Curated Dropdown */}
          <div className="relative shrink-0 w-full sm:w-auto">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleSelectFeatured(e.target.value);
              }}
              className="w-full bg-slate-900 border border-slate-700/80 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" disabled>Sample Repos ▾</option>
              {FEATURED_REPOS.map((item) => (
                <option key={item.repoPath} value={item.repoPath}>
                  {item.name} ({item.repoPath})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Presentation View Selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0 justify-center">
          <button
            onClick={() => onModeChange('showcase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeMode === 'showcase'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Showcase
          </button>

          <button
            onClick={() => onModeChange('card-embed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeMode === 'card-embed'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Card & Embed
          </button>

          <button
            onClick={() => onModeChange('docs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeMode === 'docs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Docs
          </button>
        </div>

      </div>
    </header>
  );
};
