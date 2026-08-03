import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./EmbedCodeGenerator.tsx', import.meta.url), 'utf8');

test('React export snippet contains expanded repository showcase sections', () => {
  assert.match(source, /export function GitHubRepoCard\(\{ renderWebArchitecture \} = \{}\)/);
  assert.match(source, /Architecture Diagrams/);
  assert.match(source, /Language Composition &amp; Tech Stack/);
  assert.match(source, /Repository Structure \(\{data\.repo\.defaultBranch\}\)/);
});

test('React export snippet surfaces available diagram modes and hooks', () => {
  assert.match(source, /\['mermaid', 'Mermaid'\]/);
  assert.match(source, /\['web', 'Interactive Web'\]/);
  assert.doesNotMatch(source, /\['plantuml', 'PlantUML'\]/);
  assert.doesNotMatch(source, /\['specs', 'Class Inventory'\]/);
  assert.match(source, /renderWebArchitecture\(\{/);
});

test('HTML/CSS/JS exports include parity sections and functional diagram tabs', () => {
  assert.match(source, /JS export injects complete parity card content here/);
  assert.match(source, /repo-card__diagram-tabs/);
  assert.match(source, /data-diagram-tab="mermaid"/);
  assert.match(source, /Language Composition &amp; Tech Stack/);
  assert.match(source, /Repository Structure \(/);
  assert.match(source, /Top Contributors/);
  assert.match(source, /View on GitHub/);
  assert.match(source, /renderWebArchitecture\(el, data\)/);
  assert.match(source, /window\.RepoCard = \{ render: renderRepoCard \}/);
  assert.match(source, /cdn\.jsdelivr\.net\/npm\/mermaid@11\/dist\/mermaid\.min\.js/);
});

test('iFrame and Markdown snippets include full-card parity guidance text', () => {
  assert.match(source, /Full-card parity: this iframe renders the complete repository showcase card from \/embed/);
  assert.match(source, /\*\*Full-card parity note:\*\* Markdown is badge-only/);
});
