export interface RepoOwner {
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface RepoData {
  id: number;
  name: string;
  full_name: string;
  owner: RepoOwner;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  language: string | null;
  license: string | null;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  homepage: string | null;
  topics: string[];
  default_branch: string;
  archived?: boolean;
  fork?: boolean;
}

export interface LanguageBreakdown {
  [languageName: string]: number;
}

export interface LatestRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface TreeItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  download_url?: string;
  html_url?: string;
}

export interface FullRepoResponse {
  repo: RepoData;
  languages: LanguageBreakdown;
  latestRelease: LatestRelease | null;
  contributors: Contributor[];
  readme: string;
  tree: TreeItem[];
}

export type ThemeStyle = 'modern-light' | 'dark-emerald' | 'github-dark' | 'glassmorphism' | 'cyberpunk';
export type PresentationMode = 'showcase' | 'card-embed' | 'docs' | 'portfolio';

// UML Class & Component Diagram Types
export type UmlStereotype = 'class' | 'interface' | 'abstract' | 'enum' | 'service' | 'controller' | 'component' | 'model';

export type UmlVisibility = '+' | '-' | '#'; // + public, - private, # protected

export interface UmlAttribute {
  name: string;
  type: string;
  visibility?: UmlVisibility;
  isStatic?: boolean;
}

export interface UmlMethod {
  name: string;
  parameters?: string;
  returnType: string;
  visibility?: UmlVisibility;
  isStatic?: boolean;
  isAbstract?: boolean;
}

export interface UmlClass {
  id: string;
  name: string;
  stereotype?: UmlStereotype;
  packageName?: string;
  attributes: UmlAttribute[];
  methods: UmlMethod[];
  description?: string;
  componentId?: string; // Links class to parent component in Component Diagram
}

export type UmlRelationType = 'inheritance' | 'realization' | 'composition' | 'aggregation' | 'association' | 'dependency';

export interface UmlRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: UmlRelationType;
  label?: string;
  fromMultiplicity?: string;
  toMultiplicity?: string;
}

export interface UmlComponentNode {
  id: string;
  name: string;
  packageName?: string;
  providedInterfaces: string[];
  requiredInterfaces: string[];
  containedClassIds: string[];
  description?: string;
}

export interface UmlDiagramData {
  title: string;
  summary: string;
  classes: UmlClass[];
  relationships: UmlRelationship[];
  components?: UmlComponentNode[];
  mermaidCode?: string;
  plantUmlCode?: string;
}

