import { FullRepoResponse, UmlDiagramData, UmlClass, UmlRelationship, UmlVisibility, UmlAttribute, UmlMethod, UmlComponentNode, UmlStereotype } from '../types';

export function deriveComponentsFromClasses(classes: UmlClass[], relationships: UmlRelationship[]): { components: UmlComponentNode[]; updatedClasses: UmlClass[] } {
  const packageMap = new Map<string, UmlClass[]>();

  classes.forEach((c) => {
    let pkg = c.packageName || 'src';
    if (!packageMap.has(pkg)) {
      packageMap.set(pkg, []);
    }
    packageMap.get(pkg)!.push(c);
  });

  const components: UmlComponentNode[] = [];
  const updatedClasses = [...classes];

  let compIdx = 1;
  packageMap.forEach((classList, pkgName) => {
    const compId = `comp_${compIdx++}`;
    const providedInterfaces: string[] = [];
    const requiredInterfaces: string[] = [];
    const classIds = classList.map((c) => c.id);

    // Assign componentId to classes
    classList.forEach((c) => {
      const target = updatedClasses.find((uc) => uc.id === c.id);
      if (target) {
        target.componentId = compId;
      }

      if (c.stereotype === 'interface') {
        providedInterfaces.push(c.name);
      }
    });

    // Check relationships to find required interfaces or services
    relationships.forEach((rel) => {
      if (classIds.includes(rel.fromId) && !classIds.includes(rel.toId)) {
        const targetClass = classes.find((c) => c.id === rel.toId);
        if (targetClass && (targetClass.stereotype === 'interface' || targetClass.stereotype === 'service')) {
          if (!requiredInterfaces.includes(targetClass.name)) {
            requiredInterfaces.push(targetClass.name);
          }
        }
      }
    });

    // Component name formatting
    let cleanName = pkgName.split('/').filter(Boolean).pop() || 'Core Subsystem';
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    if (!cleanName.toLowerCase().includes('component') && !cleanName.toLowerCase().includes('subsystem')) {
      cleanName += ' Subsystem';
    }

    components.push({
      id: compId,
      name: cleanName,
      packageName: pkgName,
      providedInterfaces,
      requiredInterfaces,
      containedClassIds: classIds,
      description: `Component module encapsulating ${classList.map((c) => c.name).join(', ')}.`,
    });
  });

  return { components, updatedClasses };
}

/**
 * Fallback deterministic generator for UML Class Diagrams based on repo characteristics and tree file paths.
 */
export function generateDefaultUmlDiagram(data: FullRepoResponse, focusPrompt?: string): UmlDiagramData {
  const { repo, tree, readme } = data;
  const lang = (repo.language || 'TypeScript').toLowerCase();
  const repoName = repo.name;

  let classes: UmlClass[] = [];
  let relationships: UmlRelationship[] = [];

  const readmeExcerpt = (readme || '').slice(0, 3000).toLowerCase();

  // Extract source code files from tree
  const codeExts = ['.cs', '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.hpp', '.c', '.h', '.go', '.rs', '.rb', '.swift', '.kt', '.php', '.gd'];
  const codeFiles = tree
    .map((t) => t.path || t.name || '')
    .filter((p) => codeExts.some((ext) => p.toLowerCase().endsWith(ext)));

  const extractedModules = extractModulesFromPaths(codeFiles);

  // If we found 3 or more extracted source modules from the repository tree, build diagram from real tree.
  if (extractedModules.length >= 3) {
    const selectedModules = prioritizeModules(extractedModules).slice(0, 14);
    classes = selectedModules.map((module, idx) => buildClassFromModule(module, idx));
    relationships = inferArchitectureRelationships(classes);
  } else if (lang.includes('c#') || codeFiles.some(f => f.endsWith('.cs')) || readmeExcerpt.includes('unity')) {
    // Generic Unity C# project architecture — covers any Unity game or simulation project
    const projectName = capitalize(repoName);
    classes = [
      {
        id: 'c1',
        name: 'GameManager',
        stereotype: 'service',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'Instance', type: 'GameManager', visibility: '+', isStatic: true },
          { name: 'currentState', type: 'GameState', visibility: '-' },
          { name: 'isGameOver', type: 'bool', visibility: '+' },
        ],
        methods: [
          { name: 'Awake', parameters: '', returnType: 'void', visibility: '-' },
          { name: 'StartGame', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'EndGame', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'PauseGame', parameters: '', returnType: 'void', visibility: '+' },
        ],
        description: 'Central game-state singleton managing scene lifecycle, pause/resume, and game-over transitions.',
      },
      {
        id: 'c2',
        name: 'UIManager',
        stereotype: 'service',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'Instance', type: 'UIManager', visibility: '+', isStatic: true },
          { name: 'hudPanel', type: 'GameObject', visibility: '-' },
          { name: 'pausePanel', type: 'GameObject', visibility: '-' },
          { name: 'scoreText', type: 'TextMeshProUGUI', visibility: '-' },
        ],
        methods: [
          { name: 'ShowHUD', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'UpdateScore', parameters: 'score: int', returnType: 'void', visibility: '+' },
          { name: 'ShowGameOver', parameters: '', returnType: 'void', visibility: '+' },
        ],
        description: 'UI management singleton controlling canvas panels, HUD updates, and menu transitions.',
      },
      {
        id: 'c3',
        name: `${projectName}Controller`,
        stereotype: 'controller',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'speed', type: 'float', visibility: '+' },
          { name: 'rb', type: 'Rigidbody', visibility: '-' },
          { name: 'isGrounded', type: 'bool', visibility: '-' },
        ],
        methods: [
          { name: 'Start', parameters: '', returnType: 'void', visibility: '-' },
          { name: 'Update', parameters: '', returnType: 'void', visibility: '-' },
          { name: 'HandleInput', parameters: '', returnType: 'void', visibility: '-' },
          { name: 'Move', parameters: 'direction: Vector3', returnType: 'void', visibility: '+' },
        ],
        description: `Primary player MonoBehaviour handling input, physics movement, and state transitions for ${repoName}.`,
      },
      {
        id: 'c4',
        name: 'AudioManager',
        stereotype: 'service',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'Instance', type: 'AudioManager', visibility: '+', isStatic: true },
          { name: 'bgmSource', type: 'AudioSource', visibility: '-' },
          { name: 'sfxSource', type: 'AudioSource', visibility: '-' },
        ],
        methods: [
          { name: 'PlayBGM', parameters: 'clip: AudioClip', returnType: 'void', visibility: '+' },
          { name: 'PlaySFX', parameters: 'clip: AudioClip', returnType: 'void', visibility: '+' },
          { name: 'StopAll', parameters: '', returnType: 'void', visibility: '+' },
        ],
        description: 'Audio singleton managing background music and sound-effect playback.',
      },
      {
        id: 'c5',
        name: 'GameState',
        stereotype: 'model',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'level', type: 'int', visibility: '+' },
          { name: 'score', type: 'int', visibility: '+' },
          { name: 'lives', type: 'int', visibility: '+' },
          { name: 'isPlaying', type: 'bool', visibility: '+' },
        ],
        methods: [],
        description: 'Plain data object holding runtime game-state values shared between managers.',
      },
      {
        id: 'c6',
        name: 'SpawnManager',
        stereotype: 'service',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'Instance', type: 'SpawnManager', visibility: '+', isStatic: true },
          { name: 'spawnPoints', type: 'Transform[]', visibility: '-' },
          { name: 'spawnInterval', type: 'float', visibility: '+' },
        ],
        methods: [
          { name: 'StartSpawning', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'StopSpawning', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'SpawnObject', parameters: 'prefab: GameObject', returnType: 'GameObject', visibility: '+' },
        ],
        description: 'Spawn-manager singleton controlling object instantiation at designated spawn points.',
      },
      {
        id: 'c7',
        name: 'ScoreManager',
        stereotype: 'service',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'Instance', type: 'ScoreManager', visibility: '+', isStatic: true },
          { name: 'currentScore', type: 'int', visibility: '+' },
          { name: 'highScore', type: 'int', visibility: '+' },
        ],
        methods: [
          { name: 'AddScore', parameters: 'points: int', returnType: 'void', visibility: '+' },
          { name: 'ResetScore', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'SaveHighScore', parameters: '', returnType: 'void', visibility: '-' },
        ],
        description: 'Score-tracking singleton calculating, persisting, and broadcasting score updates.',
      },
      {
        id: 'c8',
        name: 'InputHandler',
        stereotype: 'component',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'horizontal', type: 'float', visibility: '+' },
          { name: 'vertical', type: 'float', visibility: '+' },
          { name: 'jumpPressed', type: 'bool', visibility: '+' },
        ],
        methods: [
          { name: 'Update', parameters: '', returnType: 'void', visibility: '-' },
          { name: 'GetMovementInput', parameters: '', returnType: 'Vector2', visibility: '+' },
        ],
        description: 'Input-abstraction MonoBehaviour caching and normalising raw Unity Input values each frame.',
      },
      {
        id: 'c9',
        name: 'PauseMenuController',
        stereotype: 'controller',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'pauseMenuUI', type: 'GameObject', visibility: '+' },
          { name: 'isPaused', type: 'bool', visibility: '-' },
        ],
        methods: [
          { name: 'Update', parameters: '', returnType: 'void', visibility: '-' },
          { name: 'Pause', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'Resume', parameters: '', returnType: 'void', visibility: '+' },
        ],
        description: 'Pause-menu MonoBehaviour listening for Escape key and delegating time scale to GameManager.',
      },
      {
        id: 'c10',
        name: 'LevelManager',
        stereotype: 'service',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'Instance', type: 'LevelManager', visibility: '+', isStatic: true },
          { name: 'currentLevel', type: 'int', visibility: '+' },
          { name: 'totalLevels', type: 'int', visibility: '+' },
        ],
        methods: [
          { name: 'LoadLevel', parameters: 'levelIndex: int', returnType: 'void', visibility: '+' },
          { name: 'LoadNextLevel', parameters: '', returnType: 'void', visibility: '+' },
          { name: 'ReloadCurrentLevel', parameters: '', returnType: 'void', visibility: '+' },
        ],
        description: 'Scene/level management singleton handling async level loading and transition effects.',
      },
      {
        id: 'c11',
        name: 'HealthComponent',
        stereotype: 'component',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'maxHealth', type: 'float', visibility: '+' },
          { name: 'currentHealth', type: 'float', visibility: '-' },
          { name: 'isDead', type: 'bool', visibility: '+' },
        ],
        methods: [
          { name: 'TakeDamage', parameters: 'damage: float', returnType: 'void', visibility: '+' },
          { name: 'Heal', parameters: 'amount: float', returnType: 'void', visibility: '+' },
          { name: 'Die', parameters: '', returnType: 'void', visibility: '-' },
        ],
        description: 'Reusable health MonoBehaviour tracking hit points and triggering death callbacks.',
      },
      {
        id: 'c12',
        name: 'EventManager',
        stereotype: 'service',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'Instance', type: 'EventManager', visibility: '+', isStatic: true },
          { name: 'listeners', type: 'Dictionary<string, UnityEvent>', visibility: '-' },
        ],
        methods: [
          { name: 'Subscribe', parameters: 'eventName: string, listener: UnityAction', returnType: 'void', visibility: '+' },
          { name: 'Unsubscribe', parameters: 'eventName: string, listener: UnityAction', returnType: 'void', visibility: '+' },
          { name: 'TriggerEvent', parameters: 'eventName: string', returnType: 'void', visibility: '+' },
        ],
        description: 'Centralised event-bus singleton decoupling systems via publish/subscribe messaging.',
      },
      {
        id: 'c13',
        name: 'MonoBehaviourBase',
        stereotype: 'abstract',
        packageName: 'Assets/Scripts',
        attributes: [
          { name: 'isInitialized', type: 'bool', visibility: '#' },
        ],
        methods: [
          { name: 'Initialize', parameters: '', returnType: 'void', visibility: '#', isAbstract: true },
          { name: 'OnDestroy', parameters: '', returnType: 'void', visibility: '#' },
        ],
        description: 'Abstract base MonoBehaviour enforcing a standardised initialization contract across all scripts.',
      },
    ];

    relationships = [
      { id: 'r1',  fromId: 'c3',  toId: 'c1',  type: 'dependency',   label: 'queries state' },
      { id: 'r2',  fromId: 'c3',  toId: 'c8',  type: 'composition',  label: 'driven by' },
      { id: 'r3',  fromId: 'c1',  toId: 'c2',  type: 'association',  label: 'notifies UI' },
      { id: 'r4',  fromId: 'c1',  toId: 'c5',  type: 'composition',  label: 'owns state', fromMultiplicity: '1', toMultiplicity: '1' },
      { id: 'r5',  fromId: 'c1',  toId: 'c7',  type: 'dependency',   label: 'uses score' },
      { id: 'r6',  fromId: 'c1',  toId: 'c10', type: 'dependency',   label: 'triggers level load' },
      { id: 'r7',  fromId: 'c2',  toId: 'c7',  type: 'association',  label: 'displays score' },
      { id: 'r8',  fromId: 'c2',  toId: 'c5',  type: 'dependency',   label: 'reads game state' },
      { id: 'r9',  fromId: 'c6',  toId: 'c1',  type: 'dependency',   label: 'checks game state' },
      { id: 'r10', fromId: 'c6',  toId: 'c12', type: 'dependency',   label: 'fires spawn events' },
      { id: 'r11', fromId: 'c9',  toId: 'c1',  type: 'association',  label: 'pauses game' },
      { id: 'r12', fromId: 'c9',  toId: 'c2',  type: 'association',  label: 'controls pause panel' },
      { id: 'r13', fromId: 'c11', toId: 'c12', type: 'dependency',   label: 'fires death event' },
      { id: 'r14', fromId: 'c11', toId: 'c1',  type: 'dependency',   label: 'signals game over' },
      { id: 'r15', fromId: 'c3',  toId: 'c11', type: 'composition',  label: 'has health', fromMultiplicity: '1', toMultiplicity: '1' },
      { id: 'r16', fromId: 'c4',  toId: 'c12', type: 'dependency',   label: 'responds to events' },
      { id: 'r17', fromId: 'c3',  toId: 'c13', type: 'inheritance',  label: 'extends' },
      { id: 'r18', fromId: 'c11', toId: 'c13', type: 'inheritance',  label: 'extends' },
    ];

  } else if (lang.includes('typescript') || lang.includes('javascript')) {
    // Web / JS / TS Application Architecture
    const hasExpress = codeFiles.some(f => f.includes('server')) || readmeExcerpt.includes('express');
    const hasReact = codeFiles.some(f => f.includes('component')) || readmeExcerpt.includes('react');

    classes = [
      {
        id: 'c1',
        name: `${capitalize(repoName)}App`,
        stereotype: 'component',
        packageName: 'src/App',
        attributes: [
          { name: 'activeState', type: 'AppState', visibility: '-' },
          { name: 'config', type: 'AppConfig', visibility: '+' },
          { name: 'isLoaded', type: 'boolean', visibility: '#' },
        ],
        methods: [
          { name: 'initialize', parameters: 'options: ConfigOptions', returnType: 'Promise<void>', visibility: '+' },
          { name: 'render', parameters: '', returnType: 'ReactNode', visibility: '+' },
          { name: 'handleStateChange', parameters: 'newState: AppState', returnType: 'void', visibility: '-' },
        ],
        description: 'Main application entry root component managing state and routing.'
      },
      {
        id: 'c2',
        name: 'IRepositoryData',
        stereotype: 'interface',
        packageName: 'src/types',
        attributes: [
          { name: 'id', type: 'string', visibility: '+' },
          { name: 'name', type: 'string', visibility: '+' },
          { name: 'owner', type: 'UserOwner', visibility: '+' },
          { name: 'stargazersCount', type: 'number', visibility: '+' },
        ],
        methods: [
          { name: 'getMetadata', parameters: '', returnType: 'Record<string, unknown>', visibility: '+' },
          { name: 'validate', parameters: '', returnType: 'boolean', visibility: '+' },
        ],
        description: 'Core domain contract representing repository entity metadata.'
      },
      {
        id: 'c3',
        name: 'GitHubApiService',
        stereotype: 'service',
        packageName: 'src/services',
        attributes: [
          { name: 'baseUrl', type: 'string', visibility: '-' },
          { name: 'cache', type: 'Map<string, CacheEntry>', visibility: '-' },
          { name: 'timeoutMs', type: 'number', visibility: '#' },
        ],
        methods: [
          { name: 'fetchRepositoryDetails', parameters: 'owner: string, repo: string', returnType: 'Promise<IRepositoryData>', visibility: '+' },
          { name: 'getReleaseInfo', parameters: 'tag: string', returnType: 'Promise<ReleaseInfo>', visibility: '+' },
          { name: 'clearCache', parameters: '', returnType: 'void', visibility: '-' },
        ],
        description: 'Service handling REST communications and caching with GitHub APIs.'
      },
      {
        id: 'c4',
        name: 'HeroCardComponent',
        stereotype: 'component',
        packageName: 'src/components',
        attributes: [
          { name: 'data', type: 'IRepositoryData', visibility: '+' },
          { name: 'theme', type: 'ThemeStyle', visibility: '+' },
          { name: 'copiedState', type: 'boolean', visibility: '-' },
        ],
        methods: [
          { name: 'renderCard', parameters: 'props: CardProps', returnType: 'JSX.Element', visibility: '+' },
          { name: 'copyCloneCommand', parameters: 'url: string', returnType: 'void', visibility: '+' },
        ],
        description: 'Primary showcase card UI component presenting live repository statistics.'
      },
      {
        id: 'c5',
        name: 'UmlDiagramViewer',
        stereotype: 'component',
        packageName: 'src/components',
        attributes: [
          { name: 'diagramData', type: 'UmlDiagramData', visibility: '+' },
          { name: 'zoomLevel', type: 'number', visibility: '-' },
        ],
        methods: [
          { name: 'renderDiagram', parameters: '', returnType: 'JSX.Element', visibility: '+' },
          { name: 'exportSvg', parameters: '', returnType: 'void', visibility: '+' },
        ],
        description: 'Interactive visualizer rendering UML class structures and relationship links.'
      }
    ];

    relationships = [
      { id: 'r1', fromId: 'c1', toId: 'c3', type: 'dependency', label: 'uses service' },
      { id: 'r2', fromId: 'c1', toId: 'c4', type: 'composition', label: 'contains' },
      { id: 'r3', fromId: 'c4', toId: 'c2', type: 'association', label: 'renders' },
      { id: 'r4', fromId: 'c4', toId: 'c5', type: 'aggregation', label: 'embeds' },
      { id: 'r5', fromId: 'c3', toId: 'c2', type: 'realization', label: 'returns' },
    ];
  } else if (lang.includes('python')) {
    classes = [
      {
        id: 'c1',
        name: `${capitalize(repoName)}Controller`,
        stereotype: 'controller',
        packageName: 'app.controllers',
        attributes: [
          { name: 'router', type: 'APIRouter', visibility: '+' },
          { name: 'db_session', type: 'Session', visibility: '-' },
        ],
        methods: [
          { name: 'get_repository', parameters: 'repo_id: str', returnType: 'JSONResponse', visibility: '+' },
          { name: 'generate_uml', parameters: 'payload: RepoPayload', returnType: 'UmlResponse', visibility: '+' },
        ],
        description: 'API endpoint controller managing incoming requests and response formatting.'
      },
      {
        id: 'c2',
        name: 'BaseModelSchema',
        stereotype: 'abstract',
        packageName: 'app.models',
        attributes: [
          { name: 'id', type: 'UUID', visibility: '+' },
          { name: 'created_at', type: 'datetime', visibility: '+' },
        ],
        methods: [
          { name: 'to_dict', parameters: '', returnType: 'dict', visibility: '+' },
        ],
        description: 'Abstract base model providing primary metadata fields and serialization.'
      },
      {
        id: 'c3',
        name: 'RepositoryModel',
        stereotype: 'model',
        packageName: 'app.models',
        attributes: [
          { name: 'name', type: 'str', visibility: '+' },
          { name: 'stars', type: 'int', visibility: '+' },
        ],
        methods: [
          { name: 'calculate_score', parameters: '', returnType: 'float', visibility: '+' },
        ],
        description: 'Database entity model storing repository statistics and properties.'
      },
      {
        id: 'c4',
        name: 'ArchitectureAnalyzer',
        stereotype: 'service',
        packageName: 'app.services',
        attributes: [
          { name: 'parser', type: 'ASTParser', visibility: '-' },
        ],
        methods: [
          { name: 'parse_codebase', parameters: 'source_tree: dict', returnType: 'UmlDiagramData', visibility: '+' },
        ],
        description: 'Core logic service extracting class definitions and inheritance graphs.'
      }
    ];

    relationships = [
      { id: 'r1', fromId: 'c3', toId: 'c2', type: 'inheritance', label: 'extends' },
      { id: 'r2', fromId: 'c1', toId: 'c4', type: 'dependency', label: 'invokes' },
      { id: 'r3', fromId: 'c4', toId: 'c3', type: 'association', label: 'analyzes' },
    ];
  } else {
    // Java / C# / Generic OOP Architecture
    classes = [
      {
        id: 'c1',
        name: `I${capitalize(repoName)}Service`,
        stereotype: 'interface',
        packageName: 'com.app.service',
        attributes: [],
        methods: [
          { name: 'processData', parameters: 'input: DataPayload', returnType: 'ProcessResult', visibility: '+' },
        ],
        description: 'Core interface contract defining data processing operations.'
      },
      {
        id: 'c2',
        name: `${capitalize(repoName)}ServiceImpl`,
        stereotype: 'service',
        packageName: 'com.app.service.impl',
        attributes: [
          { name: 'repository', type: 'IDataRepository', visibility: '-' },
        ],
        methods: [
          { name: 'processData', parameters: 'input: DataPayload', returnType: 'ProcessResult', visibility: '+' },
        ],
        description: 'Service implementation managing core repository logic.'
      },
      {
        id: 'c3',
        name: 'RepositoryEntity',
        stereotype: 'model',
        packageName: 'com.app.domain',
        attributes: [
          { name: 'id', type: 'Long', visibility: '-' },
          { name: 'name', type: 'String', visibility: '-' },
        ],
        methods: [
          { name: 'getId', parameters: '', returnType: 'Long', visibility: '+' },
        ],
        description: 'Domain entity encapsulating repository persistent state.'
      }
    ];

    relationships = [
      { id: 'r1', fromId: 'c2', toId: 'c1', type: 'realization', label: 'implements' },
      { id: 'r2', fromId: 'c2', toId: 'c3', type: 'association', label: 'manages' },
    ];
  }

  const { components, updatedClasses } = deriveComponentsFromClasses(classes, relationships);
  const mermaidCode = generateMermaidCode(updatedClasses, relationships);
  const plantUmlCode = generatePlantUmlCode(updatedClasses, relationships);

  return {
    title: `${repo.name} UML Architecture Diagram`,
    summary: focusPrompt 
      ? `Custom architectural focus: "${focusPrompt}". Visualized core modules, interfaces, and relationship dependencies.`
      : `Object-oriented class structure and system architecture for ${repo.full_name} (${repo.language || 'Multi-language'}).`,
    classes: updatedClasses,
    relationships,
    components,
    mermaidCode,
    plantUmlCode,
  };
}

export function generateMermaidCode(classes: UmlClass[], relationships: UmlRelationship[]): string {
  let code = 'classDiagram\n';
  const sortedClasses = [...classes].sort((a, b) => `${a.packageName || ''}/${a.name}`.localeCompare(`${b.packageName || ''}/${b.name}`));
  const idToClass = new Map(sortedClasses.map((c) => [c.id, c] as const));

  sortedClasses.forEach((c) => {
    const stereo = c.stereotype ? `<<${c.stereotype}>> ` : '';
    code += `  class ${sanitizeId(c.name)} {\n`;
    if (stereo) {
      code += `    ${stereo}\n`;
    }
    c.attributes.forEach((attr) => {
      const vis = attr.visibility || '+';
      const staticMarker = attr.isStatic ? '$' : '';
      code += `    ${vis}${staticMarker}${attr.name}: ${sanitizeMermaidType(attr.type)}\n`;
    });
    c.methods.forEach((m) => {
      const vis = m.visibility || '+';
      const staticMarker = m.isStatic ? '$' : '';
      const abstractMarker = m.isAbstract ? '*' : '';
      code += `    ${vis}${staticMarker}${abstractMarker}${m.name}(${sanitizeMermaidType(m.parameters || '')}) : ${sanitizeMermaidType(m.returnType)}\n`;
    });
    code += '  }\n';
  });

  relationships.forEach((rel) => {
    const fromClass = idToClass.get(rel.fromId)?.name || rel.fromId;
    const toClass = idToClass.get(rel.toId)?.name || rel.toId;
    const from = sanitizeId(fromClass);
    const to = sanitizeId(toClass);
    const fromMult = rel.fromMultiplicity ? ` "${rel.fromMultiplicity}"` : '';
    const toMult = rel.toMultiplicity ? ` "${rel.toMultiplicity}"` : '';
    const label = rel.label ? ` : ${rel.label}` : '';

    switch (rel.type) {
      case 'inheritance':
        code += `  ${to}${toMult} <|--${fromMult} ${from}${label}\n`;
        break;
      case 'realization':
        code += `  ${to}${toMult} <|..${fromMult} ${from}${label}\n`;
        break;
      case 'composition':
        code += `  ${from}${fromMult} *--${toMult} ${to}${label}\n`;
        break;
      case 'aggregation':
        code += `  ${from}${fromMult} o--${toMult} ${to}${label}\n`;
        break;
      case 'dependency':
        code += `  ${from}${fromMult} ..>${toMult} ${to}${label}\n`;
        break;
      case 'association':
      default:
        code += `  ${from}${fromMult} -->${toMult} ${to}${label}\n`;
        break;
    }
  });

  return code;
}

export function generatePlantUmlCode(classes: UmlClass[], relationships: UmlRelationship[]): string {
  let code = '@startuml\n';
  code += '!theme plain\n';
  code += 'skinparam classAttributeIconSize 0\n\n';
  const sortedClasses = [...classes].sort((a, b) => `${a.packageName || ''}/${a.name}`.localeCompare(`${b.packageName || ''}/${b.name}`));
  const idToClass = new Map(sortedClasses.map((c) => [c.id, c] as const));
  const packageMap = new Map<string, UmlClass[]>();

  sortedClasses.forEach((c) => {
    const pkg = c.packageName || 'root';
    const bucket = packageMap.get(pkg) || [];
    bucket.push(c);
    packageMap.set(pkg, bucket);
  });

  packageMap.forEach((pkgClasses, pkgName) => {
    code += `package "${pkgName}" {\n`;
    pkgClasses.forEach((c) => {
      const typeKeyword =
        c.stereotype === 'interface'
          ? 'interface'
          : c.stereotype === 'abstract'
            ? 'abstract class'
            : c.stereotype === 'enum'
              ? 'enum'
              : 'class';
      code += `  ${typeKeyword} ${sanitizeId(c.name)} {\n`;
      c.attributes.forEach((attr) => {
        const staticMarker = attr.isStatic ? '{static} ' : '';
        code += `    ${staticMarker}${attr.visibility || '+'}${attr.name} : ${attr.type}\n`;
      });
      c.methods.forEach((m) => {
        const staticMarker = m.isStatic ? '{static} ' : '';
        const abstractMarker = m.isAbstract ? '{abstract} ' : '';
        code += `    ${staticMarker}${abstractMarker}${m.visibility || '+'}${m.name}(${m.parameters || ''}) : ${m.returnType}\n`;
      });
      code += '  }\n';
    });
    code += '}\n\n';
  });

  relationships.forEach((rel) => {
    const fromClass = idToClass.get(rel.fromId)?.name || rel.fromId;
    const toClass = idToClass.get(rel.toId)?.name || rel.toId;
    const from = sanitizeId(fromClass);
    const to = sanitizeId(toClass);
    const fromMult = rel.fromMultiplicity ? `"${rel.fromMultiplicity}" ` : '';
    const toMult = rel.toMultiplicity ? ` "${rel.toMultiplicity}"` : '';
    const label = rel.label ? ` : ${rel.label}` : '';

    switch (rel.type) {
      case 'inheritance':
        code += `${to}${toMult} <|-- ${fromMult}${from}${label}\n`;
        break;
      case 'realization':
        code += `${to}${toMult} <|.. ${fromMult}${from}${label}\n`;
        break;
      case 'composition':
        code += `${from} ${fromMult}*--${toMult} ${to}${label}\n`;
        break;
      case 'aggregation':
        code += `${from} ${fromMult}o--${toMult} ${to}${label}\n`;
        break;
      case 'dependency':
        code += `${from} ${fromMult}..>${toMult} ${to}${label}\n`;
        break;
      case 'association':
      default:
        code += `${from} ${fromMult}-->${toMult} ${to}${label}\n`;
        break;
    }
  });

  code += '@enduml';
  return code;
}

interface ExtractedModule {
  className: string;
  packageName: string;
  path: string;
  ext: string;
}

function extractModulesFromPaths(codeFiles: string[]): ExtractedModule[] {
  const ignoredFileNames = new Set([
    'vite.config',
    'tailwind.config',
    'postcss.config',
    'package',
    'tsconfig',
    'babel.config',
    'webpack.config',
  ]);
  const moduleMap = new Map<string, ExtractedModule>();

  codeFiles.forEach((path) => {
    const segments = path.split('/').filter(Boolean);
    const fileName = segments[segments.length - 1] || '';
    const dot = fileName.lastIndexOf('.');
    if (dot < 0) return;

    const ext = fileName.slice(dot).toLowerCase();
    const rawBaseName = fileName.slice(0, dot);
    const lowerBase = rawBaseName.toLowerCase();
    if (
      lowerBase.length < 2 ||
      lowerBase.endsWith('.d') ||
      lowerBase.includes('.test') ||
      lowerBase.includes('.spec') ||
      lowerBase.includes('.stories') ||
      ignoredFileNames.has(lowerBase)
    ) {
      return;
    }

    const parentFolder = segments.length > 1 ? segments[segments.length - 2] : 'root';
    const normalizedNameSource = lowerBase === 'index' ? `${parentFolder} module` : rawBaseName;
    const className = toPascalCase(normalizedNameSource);
    if (className.length < 2) return;

    const packageName = segments.length > 1 ? segments.slice(0, -1).join('/') : 'root';
    const key = `${packageName}/${className}`;
    if (!moduleMap.has(key)) {
      moduleMap.set(key, { className, packageName, path, ext });
    }
  });

  return Array.from(moduleMap.values());
}

function prioritizeModules(modules: ExtractedModule[]): ExtractedModule[] {
  const score = (m: ExtractedModule): number => {
    const lowerPath = m.path.toLowerCase();
    const lowerName = m.className.toLowerCase();
    let weight = 0;

    // Unity / C# paths
    if (lowerPath.startsWith('assets/scripts/')) weight += 35;
    if (lowerPath.includes('/scripts/') && m.ext === '.cs') weight += 30;
    if (lowerPath.startsWith('assets/')) weight += 20;

    // Web / TS paths
    if (lowerPath.startsWith('src/')) weight += 30;
    if (lowerPath.includes('/components/')) weight += 25;
    if (lowerPath.includes('/utils/')) weight += 22;
    if (lowerPath.includes('/services/')) weight += 22;
    if (lowerPath.includes('/types')) weight += 20;
    if (lowerPath.includes('/data/')) weight += 18;
    if (lowerName.includes('app') || lowerName.includes('server')) weight += 14;
    if (m.ext === '.tsx' || m.ext === '.jsx') weight += 8;

    // Boost architecturally important Unity class names
    if (lowerName.includes('manager')) weight += 12;
    if (lowerName.includes('controller')) weight += 10;
    if (lowerName.includes('system')) weight += 8;

    return weight - lowerPath.split('/').length;
  };

  return [...modules].sort((a, b) => {
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    return `${a.packageName}/${a.className}`.localeCompare(`${b.packageName}/${b.className}`);
  });
}

function buildClassFromModule(module: ExtractedModule, index: number): UmlClass {
  const lowerPath = module.path.toLowerCase();
  const lowerName = module.className.toLowerCase();
  const isCsharp = module.ext === '.cs';

  let stereotype: UmlStereotype = 'class';
  if (
    (module.className.startsWith('I') && module.className.length > 2 && module.className[1] === module.className[1].toUpperCase()) ||
    lowerPath.includes('/types')
  ) {
    stereotype = 'interface';
  } else if (lowerName.includes('abstract') || lowerName.startsWith('base')) {
    stereotype = 'abstract';
  } else if (lowerName.includes('enum')) {
    stereotype = 'enum';
  } else if (lowerName.includes('manager') || lowerName.includes('system') || lowerName.includes('subsystem')) {
    // Unity Manager singletons and ECS systems are services
    stereotype = 'service';
  } else if (module.ext === '.tsx' || module.ext === '.jsx' || lowerPath.includes('/components/') || lowerName.includes('component')) {
    stereotype = 'component';
  } else if (
    lowerPath.includes('/services/') || lowerPath.includes('/utils/') ||
    lowerName.includes('service') || lowerName.includes('api') ||
    lowerName.includes('generator') || lowerName.includes('factory') || lowerName.includes('builder')
  ) {
    stereotype = 'service';
  } else if (
    lowerName.includes('controller') || lowerName.includes('handler') || lowerName.includes('router') ||
    lowerName.includes('ui') || lowerName.includes('hud') || lowerName.includes('menu') || lowerName.includes('panel')
  ) {
    stereotype = 'controller';
  } else if (
    lowerPath.includes('/models/') || lowerPath.includes('/data/') ||
    lowerName.includes('model') || lowerName.includes('entity') || lowerName.includes('state') ||
    lowerName.includes('data') || lowerName.includes('node') || lowerName.includes('config') || lowerName.includes('info')
  ) {
    stereotype = 'model';
  } else if (lowerName.includes('view') || lowerName.includes('screen') || lowerName.includes('display')) {
    stereotype = 'component';
  } else if (isCsharp) {
    // Default for Unity C# MonoBehaviour scripts with no matching keyword
    stereotype = 'component';
  }

  let attributes: UmlAttribute[];
  let methods: UmlMethod[];

  if (isCsharp) {
    // Unity / C# typed defaults
    if (stereotype === 'service') {
      attributes = [
        { name: 'Instance', type: module.className, visibility: '+', isStatic: true },
        { name: 'isInitialized', type: 'bool', visibility: '-' },
      ];
      methods = [
        { name: 'Awake', parameters: '', returnType: 'void', visibility: '-' },
        { name: 'Initialize', parameters: '', returnType: 'void', visibility: '+' },
      ];
    } else if (stereotype === 'controller') {
      attributes = [
        { name: 'isActive', type: 'bool', visibility: '-' },
      ];
      methods = [
        { name: 'Start', parameters: '', returnType: 'void', visibility: '-' },
        { name: 'Update', parameters: '', returnType: 'void', visibility: '-' },
      ];
    } else if (stereotype === 'model') {
      attributes = [
        { name: 'id', type: 'int', visibility: '+' },
      ];
      methods = [];
    } else if (stereotype === 'abstract') {
      attributes = [
        { name: 'gameObject', type: 'GameObject', visibility: '#' },
      ];
      methods = [
        { name: 'Initialize', parameters: '', returnType: 'void', visibility: '#', isAbstract: true },
      ];
    } else if (stereotype === 'interface') {
      attributes = [];
      methods = [
        { name: 'Initialize', parameters: '', returnType: 'void', visibility: '+' },
      ];
    } else {
      // component / MonoBehaviour
      attributes = [
        { name: 'transform', type: 'Transform', visibility: '#' },
      ];
      methods = [
        { name: 'Start', parameters: '', returnType: 'void', visibility: '-' },
        { name: 'Update', parameters: '', returnType: 'void', visibility: '-' },
      ];
    }
  } else {
    // TypeScript / web defaults
    if (stereotype === 'component') {
      attributes = [
        { name: 'props', type: `${module.className}Props`, visibility: '+' },
        { name: 'state', type: 'ViewState', visibility: '-' },
      ];
      methods = [
        { name: 'render', parameters: '', returnType: 'JSX.Element', visibility: '+' },
        { name: 'handleAction', parameters: 'event: UIEvent', returnType: 'void', visibility: '+' },
      ];
    } else if (stereotype === 'service') {
      attributes = [
        { name: 'cache', type: 'Map<string, unknown>', visibility: '-' },
        { name: 'sourcePath', type: 'string', visibility: '#' },
      ];
      methods = [
        { name: 'execute', parameters: 'input: unknown', returnType: 'Promise<unknown>', visibility: '+' },
        { name: 'clearCache', parameters: '', returnType: 'void', visibility: '+' },
      ];
    } else if (stereotype === 'controller') {
      attributes = [
        { name: 'services', type: 'ServiceRegistry', visibility: '-' },
        { name: 'route', type: 'string', visibility: '+' },
      ];
      methods = [
        { name: 'handle', parameters: 'request: RequestContext', returnType: 'ResponseContext', visibility: '+' },
        { name: 'validate', parameters: 'payload: unknown', returnType: 'boolean', visibility: '#' },
      ];
    } else if (stereotype === 'model' || stereotype === 'interface') {
      attributes = stereotype === 'interface'
        ? []
        : [
            { name: 'id', type: 'string', visibility: '+' },
            { name: 'metadata', type: 'Record<string, unknown>', visibility: '+' },
          ];
      methods = [
        { name: 'toJSON', parameters: '', returnType: 'string', visibility: '+' },
        { name: 'validate', parameters: '', returnType: 'boolean', visibility: '+' },
      ];
    } else {
      attributes = [
        { name: 'name', type: 'string', visibility: '+' },
        { name: 'modulePath', type: 'string', visibility: '#' },
      ];
      methods = [
        { name: 'initialize', parameters: '', returnType: 'void', visibility: '+' },
        { name: 'dispose', parameters: '', returnType: 'void', visibility: '+' },
      ];
    }
  }

  return {
    id: `c${index + 1}`,
    name: module.className,
    stereotype,
    packageName: module.packageName,
    attributes,
    methods,
    description: `${module.className} extracted from ${module.path}.`,
  };
}

function inferArchitectureRelationships(classes: UmlClass[]): UmlRelationship[] {
  const relations: UmlRelationship[] = [];
  const relTypePriority: Record<string, number> = {
    inheritance: 1,
    realization: 2,
    composition: 3,
    aggregation: 4,
    association: 5,
    dependency: 6,
  };

  const addRelationship = (
    fromId: string,
    toId: string,
    type: UmlRelationship['type'],
    label: string,
    fromMultiplicity?: string,
    toMultiplicity?: string,
  ) => {
    if (fromId === toId) return;
    const key = `${fromId}|${toId}`;
    const existing = relations.find((r) => `${r.fromId}|${r.toId}` === key);
    if (existing) {
      if (relTypePriority[type] < relTypePriority[existing.type]) {
        existing.type = type;
        existing.label = label;
        existing.fromMultiplicity = fromMultiplicity;
        existing.toMultiplicity = toMultiplicity;
      }
      return;
    }
    relations.push({
      id: `r${relations.length + 1}`,
      fromId,
      toId,
      type,
      label,
      fromMultiplicity,
      toMultiplicity,
    });
  };

  const interfaces = classes.filter((c) => c.stereotype === 'interface');
  const abstracts = classes.filter((c) => c.stereotype === 'abstract');
  const components = classes.filter((c) => c.stereotype === 'component');
  const services = classes.filter((c) => c.stereotype === 'service');
  const controllers = classes.filter((c) => c.stereotype === 'controller');
  const models = classes.filter((c) => c.stereotype === 'model');
  const defaultClasses = classes.filter((c) => c.stereotype === 'class' || c.stereotype === 'enum');

  // Interfaces → realizations from matching concrete classes
  interfaces.forEach((iface) => {
    const ifaceCore = iface.name.replace(/^I(?=[A-Z])/, '').toLowerCase();
    classes
      .filter((candidate) => candidate.id !== iface.id && candidate.stereotype !== 'interface' && candidate.stereotype !== 'abstract')
      .forEach((candidate) => {
        if (
          (ifaceCore.length > 2 && candidate.name.toLowerCase().includes(ifaceCore)) ||
          (candidate.packageName === iface.packageName && (candidate.stereotype === 'service' || candidate.stereotype === 'component'))
        ) {
          addRelationship(candidate.id, iface.id, 'realization', 'implements');
        }
      });
  });

  // Abstract base classes → inherited by same-package concrete classes (cap per base to avoid explosion)
  abstracts.forEach((baseClass) => {
    const concreteInPackage = classes.filter(
      (c) => c.id !== baseClass.id && c.stereotype !== 'interface' && c.stereotype !== 'abstract' && c.packageName === baseClass.packageName,
    );
    concreteInPackage.slice(0, 3).forEach((c) => addRelationship(c.id, baseClass.id, 'inheritance', 'extends'));
  });

  // Service chain: manager services depend on each other sequentially (e.g. NavigationManager → RoadGraphBuilder)
  for (let i = 0; i < services.length - 1; i++) {
    addRelationship(services[i].id, services[i + 1].id, 'dependency', 'uses');
  }

  // Services aggregate / compose models
  services.forEach((service, si) => {
    models.forEach((model, mi) => {
      if (mi < 2 || mi === si % models.length) {
        addRelationship(service.id, model.id, mi === 0 ? 'composition' : 'aggregation', 'manages', '1', '0..*');
      }
    });
  });

  // Controllers depend on services (round-robin distribution)
  controllers.forEach((controller, i) => {
    const svc = services[i % Math.max(services.length, 1)];
    if (svc) addRelationship(controller.id, svc.id, 'association', 'controls');
    // Also associate with next service if available
    const svc2 = services[(i + 1) % Math.max(services.length, 1)];
    if (svc2 && svc2.id !== svc?.id) addRelationship(controller.id, svc2.id, 'dependency', 'uses');
  });

  // Components (MonoBehaviours) depend on services (round-robin)
  components.forEach((component, i) => {
    const svc = services[i % Math.max(services.length, 1)];
    if (svc) addRelationship(component.id, svc.id, 'dependency', 'uses');
    // Components may also reference a model
    const mdl = models[i % Math.max(models.length, 1)];
    if (mdl) addRelationship(component.id, mdl.id, 'association', 'reads');
  });

  // Default (unclassified) classes link to nearest service or component
  defaultClasses.forEach((cls, i) => {
    const target = services[i % Math.max(services.length, 1)] || components[0];
    if (target) addRelationship(cls.id, target.id, 'association', 'uses');
  });

  // Within same package, connect neighbours not yet connected
  const classesByPackage = new Map<string, UmlClass[]>();
  classes.forEach((cls) => {
    const pkg = cls.packageName || 'root';
    const bucket = classesByPackage.get(pkg) || [];
    bucket.push(cls);
    classesByPackage.set(pkg, bucket);
  });

  classesByPackage.forEach((pkgClasses) => {
    const ordered = [...pkgClasses].sort((a, b) => a.name.localeCompare(b.name));
    for (let i = 0; i < Math.min(2, ordered.length - 1); i++) {
      addRelationship(ordered[i].id, ordered[i + 1].id, 'association', 'collaborates');
    }
  });

  return relations.slice(0, 30);
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Sanitizes a type string for safe use inside a Mermaid classDiagram member
 * annotation.  Handles the following risky patterns:
 *
 * - Qualified names with dots (e.g. `JSX.Element` → `JSXElement`)
 * - Union / intersection types (`string | null` → `string_null`)
 * - One-level generics converted to Mermaid tilde notation
 *   (`Map<string, unknown>` → `Map~string, unknown~`)
 * - Nested generics that Mermaid cannot represent: inner angle-bracket groups
 *   are stripped iteratively to leave the outermost base type name
 *   (`Promise<Map<string, unknown>>` → `Promise`)
 * - Stray newlines / tabs that would break the diagram syntax
 */
function sanitizeMermaidType(str: string): string {
  if (!str) return str;
  // Normalise whitespace (newlines/tabs would break the diagram line)
  let result = str.trim().replace(/[\r\n\t]/g, ' ');
  // Qualified names: remove dots (JSX.Element → JSXElement, React.FC → ReactFC)
  result = result.replace(/\./g, '');
  // Simplify union / intersection operators (string | null → string_null)
  result = result.replace(/\s*[|&]\s*/g, '_');
  // Determine the maximum depth of angle-bracket nesting
  let maxDepth = 0;
  let depth = 0;
  for (const ch of result) {
    if (ch === '<') { maxDepth = Math.max(maxDepth, ++depth); }
    else if (ch === '>') { depth = Math.max(0, depth - 1); }
  }
  if (maxDepth === 1) {
    // Simple one-level generic → Mermaid tilde notation (Map<K, V> → Map~K, V~)
    result = result.replace(/</g, '~').replace(/>/g, '~');
  } else if (maxDepth > 1) {
    // Mermaid only supports one level of generic syntax with tildes.
    // Iteratively collapse the innermost <…> groups until none remain,
    // leaving only the outermost base type name(s).
    let prev = '';
    let iterations = 0;
    while (result !== prev && iterations++ < 10) {
      prev = result;
      result = result.replace(/<[^<>]*>/g, '');
    }
    // Strip any leftover unbalanced angle brackets
    result = result.replace(/[<>]/g, '');
  }
  // Collapse multiple spaces introduced by stripping
  return result.replace(/\s+/g, ' ').trim();
}

function toPascalCase(input: string): string {
  const parts = input.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const value = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  if (!value) return 'Module';
  if (/^[0-9]/.test(value)) return `Module${value}`;
  return value;
}

function capitalize(str: string): string {
  if (!str) return 'Repository';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_]/g, '');
}
