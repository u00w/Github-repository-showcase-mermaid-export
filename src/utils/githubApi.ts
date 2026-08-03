import { FullRepoResponse } from '../types';

const GITHUB_API = 'https://api.github.com';
const HEADERS: Record<string, string> = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'GitHub-Repo-Showcase-App',
};

/**
 * Fetches full repository data directly from the GitHub API.
 * Used as a fallback when the server-side proxy (/api/github/repo) is unavailable,
 * e.g. when the app is deployed as a static site on GitHub Pages.
 *
 * Note: Unauthenticated requests are limited to 60/hour per IP by GitHub.
 */
export async function fetchRepoFromGitHub(owner: string, repo: string): Promise<FullRepoResponse> {
  const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: HEADERS });

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error('Repository not found on GitHub.');
    }
    if (repoRes.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later or select a featured sample repository.');
    }
    throw new Error(`GitHub API error (${repoRes.status})`);
  }

  const repoData = await repoRes.json();
  const branch = repoData.default_branch || 'main';

  const [languages, latestRelease, contributors, readmeContent, tree] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${owner}/${repo}/languages`, { headers: HEADERS })
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({})),

    fetch(`${GITHUB_API}/repos/${owner}/${repo}/releases/latest`, { headers: HEADERS })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null),

    fetch(`${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=12`, { headers: HEADERS })
      .then(r => r.ok ? r.json() : [])
      .catch(() => []),

    fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: { ...HEADERS, Accept: 'application/vnd.github.v3.raw' },
    })
      .then(r => r.ok ? r.text() : '')
      .catch(() => ''),

    fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: HEADERS })
      .then(async r => {
        if (!r.ok) return [];
        const data = await r.json();
        if (!data || !Array.isArray(data.tree)) return [];
        return data.tree
          .filter((item: any) => item.type === 'blob')
          .map((item: any) => ({
            name: (item.path as string).split('/').pop() || item.path,
            path: item.path as string,
            type: 'file' as const,
            size: item.size || 0,
          }));
      })
      .catch(() => []),
  ]);

  return {
    repo: {
      id: repoData.id,
      name: repoData.name,
      full_name: repoData.full_name,
      owner: {
        login: repoData.owner.login,
        avatar_url: repoData.owner.avatar_url,
        html_url: repoData.owner.html_url,
        type: repoData.owner.type,
      },
      html_url: repoData.html_url,
      description: repoData.description,
      stargazers_count: repoData.stargazers_count,
      forks_count: repoData.forks_count,
      open_issues_count: repoData.open_issues_count,
      watchers_count: repoData.subscribers_count || repoData.watchers_count,
      language: repoData.language,
      license: repoData.license ? (repoData.license.spdx_id || repoData.license.name) : null,
      pushed_at: repoData.pushed_at,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      homepage: repoData.homepage,
      topics: repoData.topics || [],
      default_branch: repoData.default_branch,
      archived: repoData.archived,
      fork: repoData.fork,
    },
    languages,
    latestRelease: latestRelease ? {
      tag_name: latestRelease.tag_name,
      name: latestRelease.name,
      published_at: latestRelease.published_at,
      body: latestRelease.body,
      html_url: latestRelease.html_url,
    } : null,
    contributors: Array.isArray(contributors) ? contributors.map((c: any) => ({
      login: c.login,
      avatar_url: c.avatar_url,
      html_url: c.html_url,
      contributions: c.contributions,
    })) : [],
    readme: readmeContent,
    tree,
  };
}
