import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDefaultUmlDiagram, generateMermaidCode, generatePlantUmlCode } from './umlGenerator';
import { FullRepoResponse, UmlClass, UmlRelationship } from '../types';

function createFixtureRepo(treePaths: string[], language = 'TypeScript', readme = 'Architecture uses components, utils, and shared types.'): FullRepoResponse {
  return {
    repo: {
      id: 1,
      name: 'demo-repo',
      full_name: 'demo/demo-repo',
      owner: {
        login: 'demo',
        avatar_url: '',
        html_url: '',
        type: 'User',
      },
      html_url: '',
      description: 'Fixture repo',
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      watchers_count: 0,
      language,
      license: null,
      pushed_at: '',
      created_at: '',
      updated_at: '',
      homepage: null,
      topics: [],
      default_branch: 'main',
    },
    languages: {},
    latestRelease: null,
    contributors: [],
    readme,
    tree: treePaths.map((path) => ({
      name: path.split('/').pop() || path,
      path,
      type: 'file',
    })),
  };
}

test('default UML diagram uses repository tree to infer richer architecture', () => {
  const data = createFixtureRepo([
    'src/components/RepositoryHeroCard.tsx',
    'src/components/UmlClassDiagramModal.tsx',
    'src/components/ReadmeViewer.tsx',
    'src/utils/githubApi.ts',
    'src/utils/umlGenerator.ts',
    'src/types.ts',
    'src/data/sampleRepos.ts',
    'server.ts',
  ]);

  const diagram = generateDefaultUmlDiagram(data);

  assert.ok(diagram.classes.length >= 6);
  assert.ok(diagram.components && diagram.components.length >= 3);
  assert.ok(diagram.relationships.some((r) => r.type === 'dependency'));
  assert.ok(diagram.relationships.some((r) => r.type === 'association'));
  assert.ok(diagram.relationships.some((r) => r.type === 'composition'));
});

test('mermaid and plantuml rendering include UML-style return syntax and multiplicity', () => {
  const classes: UmlClass[] = [
    {
      id: 'a',
      name: 'OrderService',
      stereotype: 'service',
      packageName: 'domain/service',
      attributes: [{ name: 'cache', type: 'Map<string, Order>', visibility: '-' }],
      methods: [{ name: 'findAll', parameters: '', returnType: 'Order[]', visibility: '+' }],
    },
    {
      id: 'b',
      name: 'Order',
      stereotype: 'model',
      packageName: 'domain/model',
      attributes: [{ name: 'id', type: 'string', visibility: '+' }],
      methods: [{ name: 'toJSON', parameters: '', returnType: 'string', visibility: '+' }],
    },
  ];
  const relationships: UmlRelationship[] = [
    {
      id: 'r1',
      fromId: 'a',
      toId: 'b',
      type: 'composition',
      label: 'contains',
      fromMultiplicity: '1',
      toMultiplicity: '0..*',
    },
  ];

  const mermaid = generateMermaidCode(classes, relationships);
  const plantUml = generatePlantUmlCode(classes, relationships);

  assert.ok(mermaid.includes('findAll() : Order[]'));
  assert.ok(mermaid.includes('"1" *-- "0..*"'));
  assert.ok(plantUml.includes('package "domain/model"'));
  assert.ok(plantUml.includes('"1" *-- "0..*"'));
});

test('Unity C# tree with Manager/Controller scripts produces connected class diagram', () => {
  const data = createFixtureRepo(
    [
      'Assets/Scripts/GameManager.cs',
      'Assets/Scripts/UIManager.cs',
      'Assets/Scripts/AudioManager.cs',
      'Assets/Scripts/PlayerController.cs',
      'Assets/Scripts/EnemyController.cs',
      'Assets/Scripts/SpawnManager.cs',
      'Assets/Scripts/GameState.cs',
      'Assets/Scripts/HealthComponent.cs',
      'Assets/Scripts/PauseMenuController.cs',
    ],
    'C#',
    'A Unity game project.',
  );

  const diagram = generateDefaultUmlDiagram(data);

  // Should have multiple classes
  assert.ok(diagram.classes.length >= 6, `Expected ≥6 classes, got ${diagram.classes.length}`);

  // Manager files should be recognized as service stereotype
  const serviceClasses = diagram.classes.filter((c) => c.stereotype === 'service');
  assert.ok(serviceClasses.length >= 2, `Expected ≥2 service classes, got ${serviceClasses.length}`);

  // Controller files should be recognized as controller stereotype
  const controllerClasses = diagram.classes.filter((c) => c.stereotype === 'controller');
  assert.ok(controllerClasses.length >= 1, `Expected ≥1 controller class, got ${controllerClasses.length}`);

  // Model/data files should be recognized as model stereotype
  const modelClasses = diagram.classes.filter((c) => c.stereotype === 'model');
  assert.ok(modelClasses.length >= 1, `Expected ≥1 model class, got ${modelClasses.length}`);

  // Must have meaningful relationships — no isolated nodes
  assert.ok(diagram.relationships.length >= 4, `Expected ≥4 relationships, got ${diagram.relationships.length}`);

  // Must have at least one dependency (component→manager pattern)
  assert.ok(diagram.relationships.some((r) => r.type === 'dependency'), 'Expected at least one dependency relationship');

  // All classes must appear in at least one relationship
  const connectedIds = new Set(diagram.relationships.flatMap((r) => [r.fromId, r.toId]));
  const isolated = diagram.classes.filter((c) => !connectedIds.has(c.id));
  assert.equal(isolated.length, 0, `Isolated classes (no connections): ${isolated.map((c) => c.name).join(', ')}`);

  // Mermaid output must contain class names
  const mermaid = diagram.mermaidCode || '';
  assert.ok(mermaid.includes('classDiagram'), 'Mermaid output should start with classDiagram');
  assert.ok(mermaid.includes('GameManager') || mermaid.includes('UIManager'), 'Mermaid should include manager class names');
});

test('Unity C# fallback (no tree files) produces a generic connected Unity architecture', () => {
  const data = createFixtureRepo([], 'C#', 'A Unity game project.');

  const diagram = generateDefaultUmlDiagram(data);

  assert.ok(diagram.classes.length >= 8, `Expected ≥8 fallback classes, got ${diagram.classes.length}`);
  assert.ok(diagram.relationships.length >= 8, `Expected ≥8 fallback relationships, got ${diagram.relationships.length}`);

  // All fallback classes should be in Assets/Scripts package
  assert.ok(diagram.classes.every((c) => c.packageName === 'Assets/Scripts'), 'All fallback classes should be in Assets/Scripts');

  // Should have multiple relationship types
  const relTypes = new Set(diagram.relationships.map((r) => r.type));
  assert.ok(relTypes.size >= 3, `Expected ≥3 distinct relationship types, got ${relTypes.size}`);
});


test('default UML diagram uses repository tree to infer richer architecture', () => {
  const data = createFixtureRepo([
    'src/components/RepositoryHeroCard.tsx',
    'src/components/UmlClassDiagramModal.tsx',
    'src/components/ReadmeViewer.tsx',
    'src/utils/githubApi.ts',
    'src/utils/umlGenerator.ts',
    'src/types.ts',
    'src/data/sampleRepos.ts',
    'server.ts',
  ]);

  const diagram = generateDefaultUmlDiagram(data);

  assert.ok(diagram.classes.length >= 6);
  assert.ok(diagram.components && diagram.components.length >= 3);
  assert.ok(diagram.relationships.some((r) => r.type === 'dependency'));
  assert.ok(diagram.relationships.some((r) => r.type === 'association'));
  assert.ok(diagram.relationships.some((r) => r.type === 'composition'));
});

test('mermaid and plantuml rendering include UML-style return syntax and multiplicity', () => {
  const classes: UmlClass[] = [
    {
      id: 'a',
      name: 'OrderService',
      stereotype: 'service',
      packageName: 'domain/service',
      attributes: [{ name: 'cache', type: 'Map<string, Order>', visibility: '-' }],
      methods: [{ name: 'findAll', parameters: '', returnType: 'Order[]', visibility: '+' }],
    },
    {
      id: 'b',
      name: 'Order',
      stereotype: 'model',
      packageName: 'domain/model',
      attributes: [{ name: 'id', type: 'string', visibility: '+' }],
      methods: [{ name: 'toJSON', parameters: '', returnType: 'string', visibility: '+' }],
    },
  ];
  const relationships: UmlRelationship[] = [
    {
      id: 'r1',
      fromId: 'a',
      toId: 'b',
      type: 'composition',
      label: 'contains',
      fromMultiplicity: '1',
      toMultiplicity: '0..*',
    },
  ];

  const mermaid = generateMermaidCode(classes, relationships);
  const plantUml = generatePlantUmlCode(classes, relationships);

  assert.ok(mermaid.includes('findAll() : Order[]'));
  assert.ok(mermaid.includes('"1" *-- "0..*"'));
  assert.ok(plantUml.includes('package "domain/model"'));
  assert.ok(plantUml.includes('"1" *-- "0..*"'));
});

test('generateMermaidCode sanitizes punctuation-heavy TypeScript type signatures', () => {
  const classes: UmlClass[] = [
    {
      id: 'a',
      name: 'ComplexTypeService',
      stereotype: 'service',
      packageName: 'src/services',
      attributes: [
        { name: 'cache', type: 'Map<string, unknown>', visibility: '-' },
        { name: 'registry', type: 'Record<string, unknown>', visibility: '+' },
        { name: 'element', type: 'JSX.Element', visibility: '+' },
        { name: 'nullable', type: 'string | null', visibility: '-' },
      ],
      methods: [
        { name: 'getItems', parameters: 'id: string', returnType: 'Promise<Map<string, unknown>>', visibility: '+' },
        { name: 'render', parameters: 'props: Record<string, unknown>', returnType: 'JSX.Element', visibility: '+' },
        { name: 'find', parameters: 'key: string', returnType: 'string | null', visibility: '+' },
        { name: 'update', parameters: 'data: Record<string, unknown>', returnType: 'Promise<void>', visibility: '+' },
      ],
    },
  ];

  const mermaid = generateMermaidCode(classes, []);

  // Must start with classDiagram
  assert.ok(mermaid.startsWith('classDiagram\n'), 'Output must start with classDiagram');

  // Mermaid uses <<stereotype>> markers which are valid syntax; strip those before
  // checking for raw angle brackets that would break the type parser.
  const withoutStereotypes = mermaid.replace(/<<[^>]*>>/g, '');
  assert.ok(!withoutStereotypes.includes('<'), 'No raw < outside stereotype markers');
  assert.ok(!withoutStereotypes.includes('>'), 'No raw > outside stereotype markers');

  // Simple one-level generics should be represented with tilde notation
  assert.ok(mermaid.includes('Map~string, unknown~'), 'Map<string, unknown> should use tilde notation');
  assert.ok(mermaid.includes('Record~string, unknown~'), 'Record<string, unknown> should use tilde notation');
  assert.ok(mermaid.includes('Promise~void~'), 'Promise<void> should use tilde notation');

  // Nested generics (depth > 1) should have inner generic args stripped
  assert.ok(!mermaid.includes('~~'), 'Nested tilde sequences must not appear');

  // Dots in qualified names should be removed (JSX.Element -> JSXElement)
  assert.ok(mermaid.includes('JSXElement'), 'JSX.Element should be sanitized to JSXElement');
  assert.ok(!mermaid.includes('JSX.Element'), 'Raw JSX.Element must not appear in output');

  // Union types should be simplified (| replaced)
  assert.ok(!mermaid.includes('|'), 'Union type | should be removed/replaced');
  assert.ok(mermaid.includes('string_null'), 'string | null should be sanitized to string_null');
});

test('generateDefaultUmlDiagram for TypeScript repo produces Mermaid without raw angle brackets in member annotations', () => {
  const data = createFixtureRepo(
    [
      'src/App.tsx',
      'src/components/HeroCard.tsx',
      'src/services/ApiService.ts',
      'src/utils/helpers.ts',
      'src/types.ts',
    ],
    'TypeScript',
  );

  const diagram = generateDefaultUmlDiagram(data);
  const mermaid = diagram.mermaidCode;

  assert.ok(mermaid.startsWith('classDiagram'), 'Should produce classDiagram');

  // Class member lines (attributes / methods) are indented with spaces and start with
  // a visibility marker (+, -, #, ~) or a stereotype marker (<<).
  // Relationship lines (e.g. A <|-- B, A ..> B) are intentionally excluded here
  // because their arrow syntax (<|--, ..>, -->) legitimately contains angle brackets.
  const memberLines = mermaid.split('\n').filter((line) => /^\s{4}[+\-#~]/.test(line));
  memberLines.forEach((line) => {
    assert.ok(!/<(?![<])/.test(line), `Member line must not contain raw <: ${line}`);
    assert.ok(!/(?<![>])>/.test(line), `Member line must not contain raw >: ${line}`);
  });

  assert.ok(!mermaid.includes('~~'), 'Mermaid output must not contain nested ~~ sequences');
});
