import React, { useEffect, useMemo, useState } from 'react';
import { TreeItem } from '../types';
import { ChevronDown, ChevronRight, Download, ExternalLink, FileText, Folder, HardDrive } from 'lucide-react';

interface FileExplorerProps {
  tree: TreeItem[];
  repoFullName: string;
  defaultBranch: string;
}

interface FileNode extends TreeItem {
  children: FileNode[];
}

const sortNodes = (nodes: FileNode[]) => nodes.sort((a, b) => {
  if (a.type === b.type) return a.name.localeCompare(b.name);
  return a.type === 'dir' ? -1 : 1;
});

const createFileHierarchy = (items: TreeItem[]): FileNode[] => {
  const root: FileNode[] = [];

  items.forEach((item) => {
    const segments = item.path.split('/').filter(Boolean);
    let currentLevel = root;
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
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

  const sortRecursively = (nodes: FileNode[]) => {
    sortNodes(nodes).forEach((node) => sortRecursively(node.children));
  };
  sortRecursively(root);
  return root;
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ tree, repoFullName, defaultBranch }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const hierarchy = useMemo(() => createFileHierarchy(tree), [tree]);

  // Each repository starts with a compact, collapsed directory view.
  useEffect(() => {
    setExpandedFolders(new Set());
  }, [repoFullName, defaultBranch]);

  if (!tree || tree.length === 0) {
    return null;
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: FileNode, depth = 0): React.ReactNode => {
    const isFolder = node.type === 'dir';
    const isExpanded = expandedFolders.has(node.path);
    const githubUrl = isFolder
      ? `https://github.com/${repoFullName}/tree/${defaultBranch}/${node.path}`
      : node.html_url || `https://github.com/${repoFullName}/blob/${defaultBranch}/${node.path}`;

    return (
      <React.Fragment key={node.path}>
        <div
          className="flex items-center justify-between py-2 pr-2 hover:bg-slate-800/40 rounded-lg transition-colors group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isFolder ? (
              <button
                type="button"
                onClick={() => toggleFolder(node.path)}
                className="p-0.5 -m-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            {isFolder ? (
              <Folder className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`truncate hover:underline ${isFolder ? 'text-slate-200 font-semibold' : 'text-slate-300'}`}
            >
              {node.name}
            </a>
          </div>

          {!isFolder && (
            <div className="flex items-center gap-4 shrink-0 text-slate-500 text-[11px]">
              <span>{formatFileSize(node.size)}</span>
              {node.download_url && (
                <a
                  href={node.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-indigo-400 transition-opacity"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
        {isFolder && isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Repository Structure ({defaultBranch})
          </h3>
        </div>
        <a
          href={`https://github.com/${repoFullName}/tree/${defaultBranch}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
        >
          Browse Full Tree <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="font-mono text-xs">
        {hierarchy.map((node) => renderNode(node))}
      </div>
    </div>
  );
};
