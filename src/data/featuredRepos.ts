import { FullRepoResponse } from '../types';

export const FEATURED_REPOS: { name: string; repoPath: string; description: string; data: FullRepoResponse }[] = [
  {
    name: "React",
    repoPath: "facebook/react",
    description: "The library for web and native user interfaces.",
    data: {
      repo: {
        id: 10270250,
        name: "react",
        full_name: "facebook/react",
        owner: {
          login: "facebook",
          avatar_url: "https://avatars.githubusercontent.com/u/69631?v=4",
          html_url: "https://github.com/facebook",
          type: "Organization"
        },
        html_url: "https://github.com/facebook/react",
        description: "The library for web and native user interfaces.",
        stargazers_count: 228400,
        forks_count: 46200,
        open_issues_count: 1250,
        watchers_count: 6700,
        language: "JavaScript",
        license: "MIT",
        pushed_at: "2026-07-28T14:20:00Z",
        created_at: "2013-05-24T16:15:54Z",
        updated_at: "2026-07-29T21:10:00Z",
        homepage: "https://react.dev",
        topics: ["declarative", "frontend", "javascript", "jsx", "react", "ui"],
        default_branch: "main"
      },
      languages: {
        "JavaScript": 1284000,
        "TypeScript": 850000,
        "C++": 240000,
        "HTML": 45000
      },
      latestRelease: {
        tag_name: "v19.0.0",
        name: "React 19.0.0",
        published_at: "2024-12-05T18:00:00Z",
        body: "### React 19 is now available!\n\nReact 19 adds built-in support for Actions, Use Hook, Server Components, Asset Loading, and optimistic updates.\n\n- **Actions**: Async transition handling with automatically updated loading states.\n- **useActionState**: Simplifies common state updates for form submit handlers.\n- **useOptimistic**: Manage UI updates optimistically while async requests complete.",
        html_url: "https://github.com/facebook/react/releases/tag/v19.0.0"
      },
      contributors: [
        { login: "gaearon", avatar_url: "https://avatars.githubusercontent.com/u/810438?v=4", html_url: "https://github.com/gaearon", contributions: 3840 },
        { login: "acdlite", avatar_url: "https://avatars.githubusercontent.com/u/3624098?v=4", html_url: "https://github.com/acdlite", contributions: 2910 },
        { login: "sophiebits", avatar_url: "https://avatars.githubusercontent.com/u/6820?v=4", html_url: "https://github.com/sophiebits", contributions: 2450 },
        { login: "sebastianmarkbarge", avatar_url: "https://avatars.githubusercontent.com/u/1519870?v=4", html_url: "https://github.com/sebastianmarkbarge", contributions: 1980 },
        { login: "sebmarkbage", avatar_url: "https://avatars.githubusercontent.com/u/63648?v=4", html_url: "https://github.com/sebmarkbage", contributions: 1820 },
        { login: "zpao", avatar_url: "https://avatars.githubusercontent.com/u/83977?v=4", html_url: "https://github.com/zpao", contributions: 1650 }
      ],
      readme: `# React · [![Build Status](https://github.com/facebook/react/workflows/CI/badge.svg)](https://github.com/facebook/react/actions)\n\nReact is a JavaScript library for building user interfaces.\n\n* **Declarative:** React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes.\n* **Component-Based:** Build encapsulated components that manage their own state, then compose them to make complex UIs.\n* **Learn Once, Write Anywhere:** We don't make assumptions about the rest of your technology stack, so you can develop new features in React without rewriting existing code.\n\n## Quick Start\n\n\`\`\`bash\nnpm install react react-dom\n\`\`\`\n\n### Example Component\n\n\`\`\`tsx\nimport { useState } from 'react';\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(count + 1)}>\n      Count: {count}\n    </button>\n  );\n}\n\`\`\`\n\n## Documentation\n\nYou can find the React documentation [on the website](https://react.dev).\n\nCheck out our [Getting Started](https://react.dev/learn) guide and [Interactive Tutorials](https://react.dev/reference/react).`,
      tree: [
        { name: "packages", path: "packages", type: "dir" },
        { name: "fixtures", path: "fixtures", type: "dir" },
        { name: "scripts", path: "scripts", type: "dir" },
        { name: "package.json", path: "package.json", type: "file", size: 1420 },
        { name: "LICENSE", path: "LICENSE", type: "file", size: 1080 },
        { name: "README.md", path: "README.md", type: "file", size: 3450 }
      ]
    }
  },
  {
    name: "Next.js",
    repoPath: "vercel/next.js",
    description: "The React Framework for the Web.",
    data: {
      repo: {
        id: 70107786,
        name: "next.js",
        full_name: "vercel/next.js",
        owner: {
          login: "vercel",
          avatar_url: "https://avatars.githubusercontent.com/u/14985020?v=4",
          html_url: "https://github.com/vercel",
          type: "Organization"
        },
        html_url: "https://github.com/vercel/next.js",
        description: "The React Framework for the Web. Created by Vercel.",
        stargazers_count: 126500,
        forks_count: 27100,
        open_issues_count: 2400,
        watchers_count: 2900,
        language: "JavaScript",
        license: "MIT",
        pushed_at: "2026-07-29T18:00:00Z",
        created_at: "2016-10-05T23:32:51Z",
        updated_at: "2026-07-29T22:00:00Z",
        homepage: "https://nextjs.org",
        topics: ["react", "framework", "ssr", "typescript", "fullstack", "nextjs"],
        default_branch: "canary"
      },
      languages: {
        "TypeScript": 3400000,
        "Rust": 890000,
        "JavaScript": 420000,
        "CSS": 120000
      },
      latestRelease: {
        tag_name: "v15.1.0",
        name: "Next.js 15.1.0",
        published_at: "2025-01-15T12:00:00Z",
        body: "Next.js 15.1 includes Turbopack for App Router, React 19 support, Server Actions security enhancements, and optimized bundle sizes.",
        html_url: "https://github.com/vercel/next.js/releases/tag/v15.1.0"
      },
      contributors: [
        { login: "timneutkens", avatar_url: "https://avatars.githubusercontent.com/u/6324199?v=4", html_url: "https://github.com/timneutkens", contributions: 4210 },
        { login: "ijrk", avatar_url: "https://avatars.githubusercontent.com/u/22380829?v=4", html_url: "https://github.com/ijrk", contributions: 3100 },
        { login: "huozhi", avatar_url: "https://avatars.githubusercontent.com/u/251374?v=4", html_url: "https://github.com/huozhi", contributions: 2150 }
      ],
      readme: `# Next.js by Vercel\n\nNext.js is the React Framework for the Web, enabling server-rendered React applications with automatic routing, server components, and optimized asset bundling.\n\n## Getting Started\n\nRun the following command to create a new project:\n\n\`\`\`bash\nnpx create-next-app@latest\n\`\`\`\n\n## Key Features\n- **App Router:** Built on React Server Components.\n- **Turbopack:** Ultra-fast Rust-based bundler.\n- **Zero Config:** Automatic TypeScript, Tailwind CSS, and ESLint support.`,
      tree: [
        { name: "packages", path: "packages", type: "dir" },
        { name: "examples", path: "examples", type: "dir" },
        { name: "package.json", path: "package.json", type: "file", size: 2100 },
        { name: "README.md", path: "README.md", type: "file", size: 4100 }
      ]
    }
  },
  {
    name: "Tailwind CSS",
    repoPath: "tailwindlabs/tailwindcss",
    description: "A utility-first CSS framework for rapid UI development.",
    data: {
      repo: {
        id: 106012130,
        name: "tailwindcss",
        full_name: "tailwindlabs/tailwindcss",
        owner: {
          login: "tailwindlabs",
          avatar_url: "https://avatars.githubusercontent.com/u/67109815?v=4",
          html_url: "https://github.com/tailwindlabs",
          type: "Organization"
        },
        html_url: "https://github.com/tailwindlabs/tailwindcss",
        description: "A utility-first CSS framework for rapid UI development.",
        stargazers_count: 84200,
        forks_count: 4200,
        open_issues_count: 85,
        watchers_count: 1200,
        language: "TypeScript",
        license: "MIT",
        pushed_at: "2026-07-27T10:00:00Z",
        created_at: "2017-10-06T14:40:00Z",
        updated_at: "2026-07-29T19:30:00Z",
        homepage: "https://tailwindcss.com",
        topics: ["css", "tailwindcss", "ui", "design-system", "utility-first"],
        default_branch: "main"
      },
      languages: {
        "TypeScript": 1950000,
        "Rust": 620000,
        "CSS": 180000
      },
      latestRelease: {
        tag_name: "v4.0.0",
        name: "Tailwind CSS v4.0",
        published_at: "2025-01-22T15:30:00Z",
        body: "Tailwind CSS v4.0 features a completely re-imagined engine built for speed, full CSS-first configuration, automatic content detection, and modern CSS color spaces.",
        html_url: "https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.0.0"
      },
      contributors: [
        { login: "adamwathan", avatar_url: "https://avatars.githubusercontent.com/u/4323180?v=4", html_url: "https://github.com/adamwathan", contributions: 2850 },
        { login: "stevenbenner", avatar_url: "https://avatars.githubusercontent.com/u/1500684?v=4", html_url: "https://github.com/stevenbenner", contributions: 940 }
      ],
      readme: `# Tailwind CSS\n\nA utility-first CSS framework packed with classes like \`flex\`, \`pt-4\`, \`text-center\` and \`rotate-90\` that can be composed to build any design, directly in your markup.\n\n## Installation\n\n\`\`\`bash\nnpm install tailwindcss @tailwindcss/vite\n\`\`\`\n\n\`\`\`css\n@import "tailwindcss";\n\`\`\``,
      tree: [
        { name: "packages", path: "packages", type: "dir" },
        { name: "package.json", path: "package.json", type: "file", size: 1800 },
        { name: "LICENSE", path: "LICENSE", type: "file", size: 1070 }
      ]
    }
  },
  {
    name: "shadcn/ui",
    repoPath: "shadcn-ui/ui",
    description: "Beautifully designed components that you can copy and paste into your apps.",
    data: {
      repo: {
        id: 588523305,
        name: "ui",
        full_name: "shadcn-ui/ui",
        owner: {
          login: "shadcn-ui",
          avatar_url: "https://avatars.githubusercontent.com/u/124599895?v=4",
          html_url: "https://github.com/shadcn-ui",
          type: "Organization"
        },
        html_url: "https://github.com/shadcn-ui/ui",
        description: "Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.",
        stargazers_count: 73500,
        forks_count: 5900,
        open_issues_count: 140,
        watchers_count: 650,
        language: "TypeScript",
        license: "MIT",
        pushed_at: "2026-07-28T09:15:00Z",
        created_at: "2023-01-13T12:00:00Z",
        updated_at: "2026-07-29T20:45:00Z",
        homepage: "https://ui.shadcn.com",
        topics: ["components", "radix-ui", "react", "shadcn-ui", "tailwindcss"],
        default_branch: "main"
      },
      languages: {
        "TypeScript": 890000,
        "CSS": 45000
      },
      latestRelease: {
        tag_name: "v0.8.0",
        name: "v0.8.0 - New Charts & Sidebar Components",
        published_at: "2024-11-10T11:00:00Z",
        body: "Added interactive Chart components built on Recharts and a responsive App Sidebar block.",
        html_url: "https://github.com/shadcn-ui/ui/releases/tag/v0.8.0"
      },
      contributors: [
        { login: "shadcn", avatar_url: "https://avatars.githubusercontent.com/u/124599895?v=4", html_url: "https://github.com/shadcn", contributions: 1850 }
      ],
      readme: `# shadcn/ui\n\nBeautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.\n\n## Quick CLI Add\n\n\`\`\`bash\nnpx shadcn@latest add button card dialog\n\`\`\``,
      tree: [
        { name: "apps", path: "apps", type: "dir" },
        { name: "packages", path: "packages", type: "dir" },
        { name: "package.json", path: "package.json", type: "file", size: 1200 }
      ]
    }
  }
];
