import React from 'react';
import { LatestRelease, Contributor } from '../types';
import { Tag, Users, ExternalLink, Flame, Sparkles } from 'lucide-react';

interface CommunityTimelineProps {
  latestRelease: LatestRelease | null;
  contributors: Contributor[];
  repoFullName: string;
}

export const CommunityTimeline: React.FC<CommunityTimelineProps> = ({
  latestRelease,
  contributors,
  repoFullName,
}) => {
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* Latest Release Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Latest Release</h3>
            </div>
            {latestRelease && (
              <span className="text-xs text-slate-400 font-mono">
                {formatDate(latestRelease.published_at)}
              </span>
            )}
          </div>

          {latestRelease ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                  {latestRelease.tag_name}
                </span>
                <h4 className="text-xs font-semibold text-slate-200 truncate">
                  {latestRelease.name || latestRelease.tag_name}
                </h4>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed line-clamp-4 whitespace-pre-line bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {latestRelease.body || 'No release notes provided.'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-4">
              No formal releases published yet for this repository.
            </p>
          )}
        </div>

        {latestRelease && (
          <div className="pt-2">
            <a
              href={latestRelease.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              Read Full Changelog <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Top Contributors Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">Top Contributors</h3>
          </div>
          <a
            href={`https://github.com/${repoFullName}/graphs/contributors`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:underline"
          >
            View All
          </a>
        </div>

        {contributors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {contributors.slice(0, 6).map((c) => (
              <a
                key={c.login}
                href={c.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl transition-colors group"
              >
                <img
                  src={c.avatar_url}
                  alt={c.login}
                  className="w-7 h-7 rounded-lg border border-slate-700 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 truncate">
                    {c.login}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {c.contributions} commits
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-4">No contributor metrics available.</p>
        )}
      </div>

    </div>
  );
};
