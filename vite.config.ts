import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const repoName = env.VITE_REPO_NAME || process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Github-repository-showcase-mermaid';
  const isGitHubPages = Boolean(process.env.GITHUB_ACTIONS || process.env.VITE_DEPLOY_TARGET === 'github-pages');

  return {
    // GitHub Pages serves the app under the repository name.
    base: isGitHubPages ? `/${repoName}/` : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
