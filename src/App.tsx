import React, { useState, useEffect } from 'react';
import { FullRepoResponse, PresentationMode, ThemeStyle } from './types';
import { FEATURED_REPOS } from './data/featuredRepos';
import { Header } from './components/Header';
import { BestPracticesGuide } from './components/BestPracticesGuide';
import { RepositoryHeroCard } from './components/RepositoryHeroCard';
import { TechStackBreakdown } from './components/TechStackBreakdown';
import { ReadmeViewer } from './components/ReadmeViewer';
import { FileExplorer } from './components/FileExplorer';
import { CommunityTimeline } from './components/CommunityTimeline';
import { EmbedCodeGenerator } from './components/EmbedCodeGenerator';
import { Loader2, AlertCircle, Sparkles, Github, ArrowRight } from 'lucide-react';
import { fetchRepoFromGitHub } from './utils/githubApi';

const DEFAULT_REPOSITORY = 'AdamKovacs360/CoCreatorSimulationGame';

export default function App() {
  const [currentRepoInput, setCurrentRepoInput] = useState<string>(DEFAULT_REPOSITORY);
  const [repoData, setRepoData] = useState<FullRepoResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<PresentationMode>('showcase');
  const [activeTheme, setActiveTheme] = useState<ThemeStyle>('github-dark');

  // Parse repo input string (e.g. "https://www.github.com/owner/repo.git?tab=readme" or "owner/repo")
  const parseOwnerAndRepo = (input: string): { owner: string; repo: string } | null => {
    if (!input) return null;
    let str = input.trim();

    // Strip protocol, domain, and optional www.
    str = str.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
    str = str.replace(/^(www\.)?github\.com\//i, '');

    // Strip query string and fragment hash
    str = str.split('?')[0].split('#')[0];

    // Strip trailing .git and trailing slashes
    str = str.replace(/\.git$/i, '');
    str = str.replace(/\/+$/, '');

    const parts = str.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  };

  const fetchRepoData = async (inputStr: string) => {
    const parsed = parseOwnerAndRepo(inputStr);
    if (!parsed) {
      setErrorMsg("Please enter a valid GitHub repository path (e.g. 'owner/repo' or 'https://github.com/owner/repo').");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    // Check if repo matches a pre-loaded featured repo first for instant load
    const matchFeatured = FEATURED_REPOS.find(
      (f) => f.repoPath.toLowerCase() === `${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}`
    );

    if (matchFeatured) {
      setRepoData(matchFeatured.data);
      setIsLoading(false);
      return;
    }

    try {
      let data: FullRepoResponse;
      try {
        const res = await fetch(`/api/github/repo?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}`);
        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson.error || `Failed to fetch repository (${res.status})`);
        }
        data = await res.json();
      } catch (proxyErr: any) {
        // Proxy unavailable (e.g. static Pages deployment) — call GitHub API directly
        data = await fetchRepoFromGitHub(parsed.owner, parsed.repo);
      }
      setRepoData(data);
    } catch (err: any) {
      console.warn("Fetch failed, attempting fallback search in featured list:", err);
      setErrorMsg(err.message || "Failed to load repository. Check owner and repo name.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoData(DEFAULT_REPOSITORY);
  }, []);

  const handleSearch = (input: string) => {
    setCurrentRepoInput(input);
    fetchRepoData(input);
  };

  return (
    <div className="min-w-screen min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      
      {/* Navigation Header */}
      <Header
        currentRepoInput={currentRepoInput}
        onSearch={handleSearch}
        isLoading={isLoading}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        activeTheme={activeTheme}
        onThemeChange={setActiveTheme}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 space-y-6">
        
        {/* Educational Best Practices Guide */}
        <BestPracticesGuide />

        {/* Error Alert Message */}
        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-4 rounded-2xl flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">{errorMsg}</p>
              <p className="text-rose-300/80">
                Tip: Try one of our sample curated repositories below, or check your internet connection and GitHub repo spelling.
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Fetching live GitHub repository data & README...</p>
          </div>
        )}

        {/* Repository Showcase Content */}
        {!isLoading && repoData && (
          <div className="space-y-6">
            
            {/* Mode 1: Full Showcase View */}
            {activeMode === 'showcase' && (
              <>
                {/* Executive Hero Showcase Card */}
                <RepositoryHeroCard
                  data={repoData}
                  activeTheme={activeTheme}
                  onThemeChange={setActiveTheme}
                />

                {/* Grid: Tech Stack Composition & File Explorer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TechStackBreakdown
                    languages={repoData.languages}
                    topics={repoData.repo.topics}
                    license={repoData.repo.license}
                    defaultBranch={repoData.repo.default_branch}
                  />

                  <FileExplorer
                    tree={repoData.tree}
                    repoFullName={repoData.repo.full_name}
                    defaultBranch={repoData.repo.default_branch}
                  />
                </div>

                {/* Community & Latest Release Timeline */}
                <CommunityTimeline
                  latestRelease={repoData.latestRelease}
                  contributors={repoData.contributors}
                  repoFullName={repoData.repo.full_name}
                />

                {/* Rendered README Documentation */}
                <ReadmeViewer
                  readmeText={repoData.readme}
                  repoFullName={repoData.repo.full_name}
                />

                {/* Embed Code Generator */}
                <EmbedCodeGenerator
                  data={repoData}
                  activeTheme={activeTheme}
                />
              </>
            )}

            {/* Mode 2: Card Embed & Export Focus */}
            {activeMode === 'card-embed' && (
              <div className="space-y-6">
                <RepositoryHeroCard
                  data={repoData}
                  activeTheme={activeTheme}
                  onThemeChange={setActiveTheme}
                />

                <EmbedCodeGenerator
                  data={repoData}
                  activeTheme={activeTheme}
                />
              </div>
            )}

            {/* Mode 3: Documentation Focus */}
            {activeMode === 'docs' && (
              <div className="space-y-6">
                <ReadmeViewer
                  readmeText={repoData.readme}
                  repoFullName={repoData.repo.full_name}
                />

                <TechStackBreakdown
                  languages={repoData.languages}
                  topics={repoData.repo.topics}
                  license={repoData.repo.license}
                  defaultBranch={repoData.repo.default_branch}
                />
              </div>
            )}

          </div>
        )}

        {/* Curated Repos Footer Bar */}
        <div className="pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Explore Featured Open Source Projects
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURED_REPOS.map((item) => (
              <button
                key={item.repoPath}
                onClick={() => handleSearch(item.repoPath)}
                className={`p-3 rounded-xl border text-left transition-all group ${
                  repoData?.repo.full_name.toLowerCase() === item.repoPath.toLowerCase()
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-300">
                    {item.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                  {item.repoPath}
                </span>
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
