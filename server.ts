import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAIClient;
}

async function startServer() {

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Cache in-memory to prevent rate-limiting for repeated lookups
  const repoCache = new Map<string, { timestamp: number; data: any }>();
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // GitHub Proxy API route
  app.get("/api/github/repo", async (req, res) => {
    try {
      const owner = (req.query.owner as string || "").trim();
      const repo = (req.query.repo as string || "").trim();

      if (!owner || !repo) {
        return res.status(400).json({ error: "Owner and repo parameters are required" });
      }

      const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
      const cached = repoCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }

      const headers: Record<string, string> = {
        "User-Agent": "GitHub-Repo-Showcase-App",
        "Accept": "application/vnd.github.v3+json",
      };

      // Fetch repo details
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          return res.status(404).json({ error: "Repository not found on GitHub." });
        }
        if (repoRes.status === 403) {
          return res.status(429).json({ error: "GitHub API rate limit exceeded. Please try again later or select a featured sample repository." });
        }
        return res.status(repoRes.status).json({ error: `GitHub API error (${repoRes.status})` });
      }

      const repoData = await repoRes.json();

      // Fetch languages
      let languages = {};
      try {
        const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
        if (langRes.ok) languages = await langRes.json();
      } catch (e) {
        console.warn("Failed to fetch languages:", e);
      }

      // Fetch latest release
      let latestRelease = null;
      try {
        const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers });
        if (releaseRes.ok) latestRelease = await releaseRes.json();
      } catch (e) {
        console.warn("Failed to fetch latest release:", e);
      }

      // Fetch top contributors
      let contributors = [];
      try {
        const contribRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=12`, { headers });
        if (contribRes.ok) contributors = await contribRes.json();
      } catch (e) {
        console.warn("Failed to fetch contributors:", e);
      }

      // Fetch README content
      let readmeContent = "";
      try {
        const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
          headers: {
            ...headers,
            "Accept": "application/vnd.github.v3.raw",
          },
        });
        if (readmeRes.ok) {
          readmeContent = await readmeRes.text();
        }
      } catch (e) {
        console.warn("Failed to fetch README:", e);
      }

      // Fetch tree structure (recursive git tree if available, fallback to contents)
      let tree: any[] = [];
      const branch = repoData.default_branch || 'main';
      try {
        const gitTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
        if (gitTreeRes.ok) {
          const gitTreeData = await gitTreeRes.json();
          if (gitTreeData && Array.isArray(gitTreeData.tree)) {
            tree = gitTreeData.tree
              .filter((item: any) => item.type === 'blob')
              .map((item: any) => ({
                name: item.path.split('/').pop() || item.path,
                path: item.path,
                type: 'file',
                size: item.size || 0,
              }));
          }
        }
      } catch (e) {
        console.warn("Failed to fetch recursive git tree, attempting root contents fallback:", e);
      }

      if (tree.length === 0) {
        try {
          const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
          if (treeRes.ok) {
            const contents = await treeRes.json();
            if (Array.isArray(contents)) {
              tree = contents.map((item: any) => ({
                name: item.name,
                path: item.path,
                type: item.type, // 'file' or 'dir'
                size: item.size || 0,
                download_url: item.download_url,
                html_url: item.html_url,
              }));
            }
          }
        } catch (e) {
          console.warn("Failed to fetch root contents:", e);
        }
      }

      const responseData = {
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
          license: repoData.license ? repoData.license.spdx_id || repoData.license.name : null,
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

      repoCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
      return res.json(responseData);
    } catch (err: any) {
      console.error("Error fetching repository:", err);
      return res.status(500).json({ error: "Failed to fetch repository data: " + err.message });
    }
  });

  // AI-Powered UML Class Diagram generation route
  app.post("/api/gemini/uml-diagram", async (req, res) => {
    try {
      const { repoName, language, description, topics, tree, readmeSnippet, focusPrompt } = req.body || {};

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({ error: "GEMINI_API_KEY environment variable is not configured." });
      }

      // Filter source code file paths from tree
      const fileList = Array.isArray(tree) ? tree : [];
      const codeExtensions = ['.cs', '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.hpp', '.c', '.h', '.go', '.rs', '.rb', '.swift', '.kt', '.php', '.gd'];
      const codeFilePaths = fileList
        .map((f: any) => f.path || f.name || '')
        .filter((p: string) => codeExtensions.some(ext => p.toLowerCase().endsWith(ext)))
        .slice(0, 80);

      const prompt = `You are a principal software architect expert in UML Class Diagrams.
Analyze the following repository metadata and source code file paths to generate a comprehensive, highly detailed UML class diagram representing its code architecture.

Repository Name: ${repoName || 'App'}
Primary Language: ${language || 'Unknown'}
Description: ${description || 'N/A'}
Topics: ${Array.isArray(topics) ? topics.join(', ') : 'N/A'}
Source Code Files in Repository (${codeFilePaths.length} files detected):
${codeFilePaths.length > 0 ? codeFilePaths.join('\n') : '(No specific source code file paths available, infer from repository name, language, and README)'}

README Excerpt Context:
${(readmeSnippet || '').slice(0, 2500)}

${focusPrompt ? `Architectural Focus Request: "${focusPrompt}"` : ''}

INSTRUCTIONS:
1. Identify 5 to 10 main classes, interfaces, controllers, services, managers, engines, components, or models based on the source code files and repository domain.
2. For EVERY class, you MUST provide:
   - "name": Accurate class name (e.g. GameManager, CoCreatorManager, AgentController, SimulationEngine, GridSystem, BuildingData)
   - "stereotype": "class" | "interface" | "abstract" | "enum" | "service" | "controller" | "component" | "model"
   - "packageName": Package or folder path (e.g. "Assets/Scripts/Managers" or "src/services")
   - "attributes": Array of 3 to 6 realistic attributes with names, types, and visibility (+, -, #)
   - "methods": Array of 3 to 6 realistic methods with names, parameters, return types, and visibility (+, -, #)
   - "description": Clear explanation of its role in the system architecture
3. Create 5 to 10 logical relationship connections between these classes ("type": "inheritance" | "realization" | "composition" | "aggregation" | "association" | "dependency").
4. DO NOT return an empty diagram or a single node. You MUST return a rich architecture with multiple interconnected nodes.

Return ONLY a valid JSON object matching the required schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              classes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    stereotype: { type: Type.STRING },
                    packageName: { type: Type.STRING },
                    attributes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          type: { type: Type.STRING },
                          visibility: { type: Type.STRING },
                        },
                        required: ["name", "type"],
                      },
                    },
                    methods: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          parameters: { type: Type.STRING },
                          returnType: { type: Type.STRING },
                          visibility: { type: Type.STRING },
                        },
                        required: ["name", "returnType"],
                      },
                    },
                    description: { type: Type.STRING },
                  },
                  required: ["id", "name", "attributes", "methods"],
                },
              },
              relationships: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    fromId: { type: Type.STRING },
                    toId: { type: Type.STRING },
                    type: { type: Type.STRING },
                    label: { type: Type.STRING },
                  },
                  required: ["id", "fromId", "toId", "type"],
                },
              },
            },
            required: ["title", "summary", "classes", "relationships"],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response returned from Gemini AI");
      }

      const diagramData = JSON.parse(text);
      return res.json(diagramData);
    } catch (err: any) {
      console.error("Error generating UML diagram with Gemini:", err);
      return res.status(500).json({ error: err.message || "Failed to generate UML diagram" });
    }
  });


  // Vite middleware for development vs production static
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
