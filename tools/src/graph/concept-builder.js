const path = require('node:path');
const { getLayerForFile, getProjectConfig } = require('../config/layers');

/**
 * Normalizes and stems common English and code word forms.
 */
function stemWord(word) {
  if (!word || typeof word !== 'string') return '';
  let w = word.toLowerCase().trim();
  if (w.length <= 2) return w;

  // Common irregular plurals & variations
  if (w === 'enemies') return 'enemy';
  if (w === 'allies') return 'ally';
  if (w === 'avoidance') return 'avoid';
  if (w === 'collision' || w === 'collisions') return 'collide';
  if (w === 'crashes' || w === 'crashing' || w === 'crashed') return 'crash';

  // Common suffix stemming
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4 && !w.endsWith('ses')) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss')) return w.slice(0, -1);

  return w;
}

/**
 * Splits camelCase, PascalCase, snake_case, and CONSTANT_CASE identifiers into individual stemmed tokens.
 */
function tokenizeIdentifier(str) {
  if (!str || typeof str !== 'string') return [];
  const spaced = str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  
  const tokens = spaced
    .split(/[^a-zA-Z0-9]+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 1);

  const stemmed = new Set();
  for (const t of tokens) {
    stemmed.add(t);
    const s = stemWord(t);
    if (s) stemmed.add(s);
  }

  return Array.from(stemmed);
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by',
  'with', 'as', 'into', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were', 'often',
  'sometimes', 'always', 'how', 'what', 'where', 'when', 'why', 'who', 'does', 'do', 'can'
]);

/**
 * Tokenizes arbitrary natural language text or comments into normalized words.
 */
function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];
  const words = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  const result = new Set();
  for (const w of words) {
    result.add(w);
    const s = stemWord(w);
    if (s && !STOP_WORDS.has(s)) result.add(s);
  }
  return Array.from(result);
}

/**
 * Standard Domain Concept Definitions (Extensible via project config)
 */
const DEFAULT_CONCEPT_TAXONOMIES = [
  {
    id: 'auth_security',
    name: 'Authentication & Security',
    category: 'Security / Identity',
    description: 'Authentication, authorization, session management, tokens, credentials, and crypto.',
    keywords: [
      'auth', 'authenticate', 'login', 'logout', 'session', 'token', 'jwt',
      'password', 'credential', 'permission', 'role', 'authorize', 'access',
      'oauth', 'secret', 'signature', 'encrypt', 'decrypt', 'hash', 'security'
    ]
  },
  {
    id: 'data_persistence',
    name: 'Data Storage & Persistence',
    category: 'Storage / Database',
    description: 'Databases, ORM models, SQL queries, repositories, migrations, and caching.',
    keywords: [
      'database', 'db', 'query', 'sql', 'store', 'storage', 'repository',
      'model', 'entity', 'schema', 'table', 'migration', 'persist', 'save',
      'insert', 'update', 'delete', 'select', 'find', 'cache', 'redis'
    ]
  },
  {
    id: 'api_networking',
    name: 'API, Routing & Networking',
    category: 'Network / Transport',
    description: 'HTTP endpoints, REST routes, controllers, request parsing, and socket communication.',
    keywords: [
      'api', 'route', 'router', 'endpoint', 'controller', 'http', 'request',
      'response', 'payload', 'fetch', 'client', 'server', 'socket', 'websocket',
      'handler', 'middleware', 'webhook'
    ]
  },
  {
    id: 'business_logic',
    name: 'Domain & Business Workflows',
    category: 'Domain / Logic',
    description: 'Core domain services, business workflows, transactional rules, and policies.',
    keywords: [
      'service', 'workflow', 'process', 'rule', 'policy', 'manager', 'engine',
      'transaction', 'operation', 'execute', 'calculate', 'compute', 'validate',
      'order', 'payment', 'account', 'user'
    ]
  },
  {
    id: 'ui_presentation',
    name: 'UI & Presentation',
    category: 'Presentation / Views',
    description: 'User interface components, rendering templates, DOM elements, and views.',
    keywords: [
      'ui', 'view', 'component', 'render', 'template', 'layout', 'page',
      'screen', 'button', 'modal', 'form', 'input', 'display', 'panel',
      'style', 'css', 'dom', 'element'
    ]
  },
  {
    id: 'concurrency_async',
    name: 'Concurrency & Async Jobs',
    category: 'Async / Concurrency',
    description: 'Asynchronous workers, message queues, background jobs, promises, and mutex locks.',
    keywords: [
      'async', 'await', 'promise', 'worker', 'job', 'queue', 'task',
      'schedule', 'cron', 'mutex', 'lock', 'thread', 'channel', 'pool', 'batch'
    ]
  },
  {
    id: 'error_telemetry',
    name: 'Error Handling, Logging & Telemetry',
    category: 'Observability / Diagnostics',
    description: 'Error diagnostics, logging, telemetry counters, metrics, and tracing.',
    keywords: [
      'error', 'exception', 'fault', 'crash', 'fail', 'failure', 'log',
      'logger', 'logging', 'telemetry', 'trace', 'metric', 'monitor', 'alert', 'audit'
    ]
  },
  {
    id: 'config_initialization',
    name: 'Configuration & Bootstrap',
    category: 'Infrastructure / Config',
    description: 'Environment variables, app configuration, initialization, and bootstrap loading.',
    keywords: [
      'config', 'configuration', 'settings', 'options', 'env', 'environment',
      'init', 'initialize', 'bootstrap', 'setup', 'register', 'loader'
    ]
  },
  {
    id: 'affiliation',
    name: 'Affiliation & Factions',
    category: 'Simulation / Domain',
    description: 'Defines entity allegiances, hostile vs friendly relations, and target identification.',
    keywords: [
      'enemy', 'friendly', 'ally', 'allied', 'hostile', 'faction', 'team',
      'side', 'alignment', 'reputation', 'neutral', 'opponent', 'threat',
      'pirate', 'confed', 'kilrathi', 'iff'
    ]
  },
  {
    id: 'collision_avoidance',
    name: 'Collision & Steering Avoidance',
    category: 'AI / Navigation',
    description: 'Handles steering separation, obstacle avoidance, proximity raycasts, and collision prevention.',
    keywords: [
      'crash', 'collision', 'collide', 'bump', 'separation', 'avoid', 'avoidance',
      'steer', 'steering', 'obstacle', 'clearance', 'boid', 'flocking', 'repulse',
      'proximity', 'overlap'
    ]
  },
  {
    id: 'autonomy_ai',
    name: 'Autonomy & AI Decision Making',
    category: 'AI / Behavior',
    description: 'High-level decision logic, behavior trees, finite state machines, and agent autopilot.',
    keywords: [
      'ai', 'behavior', 'decision', 'brain', 'state', 'fsm', 'agent', 'autopilot',
      'patrol', 'pursuit', 'evade', 'perception', 'sensor', 'detect', 'action',
      'planner', 'task', 'controller'
    ]
  },
  {
    id: 'weapons_combat',
    name: 'Weapons & Combat Systems',
    category: 'Simulation / Combat',
    description: 'Offensive and defensive systems, weaponry, damage handling, and shields.',
    keywords: [
      'weapon', 'laser', 'projectile', 'bullet', 'shoot', 'fire', 'damage',
      'shield', 'destroy', 'destruction', 'combat', 'attack', 'defense', 'armor'
    ]
  },
  {
    id: 'movement_physics',
    name: 'Kinematics & Movement',
    category: 'Physics / Simulation',
    description: 'Physical motion, velocity integration, thrust, acceleration, and coordinates.',
    keywords: [
      'move', 'movement', 'speed', 'velocity', 'acceleration', 'force', 'thrust',
      'position', 'distance', 'vector', 'heading', 'physics', 'coords'
    ]
  },
  {
    id: 'actor_entity',
    name: 'Actors & Game Entities',
    category: 'Entities / Models',
    description: 'Simulated objects, ships, vehicles, craft, units, and players.',
    keywords: [
      'ship', 'vessel', 'craft', 'unit', 'vehicle', 'player', 'entity', 'actor'
    ]
  },
  {
    id: 'code_metrics_analysis',
    name: 'Code Metrics & Static Analysis',
    category: 'Analyzer / Quality',
    description: 'Code complexity, blast radius, call-graph reachability, and architectural scorecards.',
    keywords: [
      'complexity', 'cognitive', 'cyclomatic', 'blast', 'radius', 'hotspot',
      'risk', 'coupling', 'cycle', 'metric', 'ast', 'parser', 'lint', 'inspect',
      'exporter', 'graph'
    ]
  },
  {
    id: 'workflow_missions',
    name: 'Workflows, Missions & Contracts',
    category: 'Domain / Progression',
    description: 'Mission controllers, contract boards, campaign progression, sorties, objectives, and completion rules.',
    keywords: [
      'mission', 'contract', 'campaign', 'sortie', 'objective', 'quest', 'board',
      'briefing', 'debrief', 'operation', 'patrol', 'escort', 'bounty', 'strike',
      'accept', 'complete', 'fail', 'available', 'template', 'roster', 'wingman'
    ]
  },
  {
    id: 'navigation_routing',
    name: 'Navigation, Waypoints & Spatial Routing',
    category: 'Navigation / World',
    description: 'Nav points, flight plans, waypoint resolution, carrier recovery, docking, and jump gates.',
    keywords: [
      'waypoint', 'nav', 'route', 'destination', 'recovery', 'carrier',
      'dock', 'undock', 'launch', 'gate', 'jump', 'sector', 'transit',
      'arrive', 'arrival', 'flagship', 'claw', 'port'
    ]
  },
  {
    id: 'economy_resources',
    name: 'Economy, Rewards & Inventory',
    category: 'Simulation / Economy',
    description: 'Credits, mission payouts, cargo holds, commodities, market trading, and ordnance restocking.',
    keywords: [
      'reward', 'credit', 'money', 'payout', 'price', 'cost', 'economy', 'market',
      'trade', 'cargo', 'commodity', 'inventory', 'stock', 'ammo', 'rearm',
      'restock', 'loadout', 'salvage', 'kill', 'bounty'
    ]
  },
  {
    id: 'events_triggers',
    name: 'Events, Triggers & Messaging',
    category: 'Engine / Events',
    description: 'Dynamic event triggers, signal buses, condition evaluation, entity spawning, and story stages.',
    keywords: [
      'event', 'trigger', 'signal', 'bus', 'dispatch', 'emit', 'subscribe',
      'listen', 'handler', 'callback', 'condition', 'effect', 'spawn', 'timer',
      'stage', 'story', 'narrative'
    ]
  },
  {
    id: 'data_registry_config',
    name: 'Data Registry, Config & Validation',
    category: 'Infrastructure / Data',
    description: 'Data registries, configuration tables, schema validation, builders, and state initialization.',
    keywords: [
      'registry', 'config', 'schema', 'validate', 'build', 'generator', 'load',
      'parse', 'serialize', 'catalog', 'definition', 'manifest', 'seed', 'init'
    ]
  },
  {
    id: 'presentation_ui',
    name: 'UI, HUD & Presentation',
    category: 'Presentation / Views',
    description: 'User interface modals, tactical HUD overlays, rendering pipelines, comms dialogs, and logging.',
    keywords: [
      'ui', 'hud', 'render', 'draw', 'view', 'modal', 'dialog', 'screen',
      'panel', 'button', 'comms', 'transmission', 'log', 'display', 'reticle',
      'camera', 'viewport'
    ]
  }
];

/**
 * Initializes the concept catalog with stemmed keywords.
 */
function initializeConceptCatalog(taxonomies) {
  const catalog = new Map();
  for (const tax of taxonomies) {
    const stemmedKeywords = new Set();
    for (const kw of tax.keywords) {
      stemmedKeywords.add(kw.toLowerCase());
      const s = stemWord(kw);
      if (s) stemmedKeywords.add(s);
    }

    catalog.set(tax.id, {
      id: tax.id,
      name: tax.name,
      category: tax.category,
      description: tax.description,
      keywords: Array.from(stemmedKeywords),
      symbols: [],
      files: new Set(),
      fileScores: new Map(),
      governingEnums: []
    });
  }
  return catalog;
}

/**
 * Extracts and tokenizes all identifier words from a symbol.
 */
function collectSymbolTokens(sym) {
  const tokens = new Set();
  for (const t of tokenizeIdentifier(sym.name)) tokens.add(t);
  if (sym.parentClass) {
    for (const t of tokenizeIdentifier(sym.parentClass)) tokens.add(t);
  }
  for (const t of tokenizeIdentifier(sym.file)) tokens.add(t);
  if (sym.comment) {
    for (const t of tokenizeText(sym.comment)) tokens.add(t);
  }
  if (sym.type === 'enum' && Array.isArray(sym.keys)) {
    for (const k of sym.keys) {
      for (const t of tokenizeIdentifier(k)) tokens.add(t);
    }
  }
  return tokens;
}

/**
 * Scores a symbol against all concepts in the catalog.
 */
function scoreSymbolAgainstConcepts(sym, tokens, conceptCatalog) {
  const matchedForSymbol = new Set();

  for (const [conceptId, concept] of conceptCatalog.entries()) {
    let score = 0;
    const matchedTerms = [];

    for (const kw of concept.keywords) {
      if (tokens.has(kw)) {
        score += 1;
        matchedTerms.push(kw);
      }
    }

    if (score > 0) {
      matchedForSymbol.add(conceptId);
      concept.files.add(sym.file);
      concept.fileScores.set(sym.file, (concept.fileScores.get(sym.file) || 0) + score);

      const entry = {
        id: sym.id,
        name: sym.name,
        type: sym.type,
        file: sym.file,
        startLine: sym.startLine,
        endLine: sym.endLine,
        score,
        matchedTerms,
        comment: sym.comment || null
      };

      if (sym.type === 'enum') {
        concept.governingEnums.push(entry);
      } else {
        concept.symbols.push(entry);
      }
    }
  }

  return matchedForSymbol;
}

/**
 * Maps all symbols in the catalog to their matching concepts.
 */
function mapSymbolsToConcepts(blastIndex, conceptCatalog) {
  const symbolToConcepts = new Map();

  for (const [id, sym] of blastIndex.catalog.entries()) {
    const tokens = collectSymbolTokens(sym);
    const matchedConcepts = scoreSymbolAgainstConcepts(sym, tokens, conceptCatalog);
    if (matchedConcepts.size > 0) {
      symbolToConcepts.set(id, matchedConcepts);
    }
  }

  for (const concept of conceptCatalog.values()) {
    concept.symbols.sort((a, b) => b.score - a.score);
    concept.governingEnums.sort((a, b) => b.score - a.score);
    const sortedFiles = Array.from(concept.files).sort(
      (a, b) => (concept.fileScores.get(b) || 0) - (concept.fileScores.get(a) || 0)
    );
    concept.files = new Set(sortedFiles);
  }

  return symbolToConcepts;
}

/**
 * Detects cross-concept intersections across graph call edges.
 */
function findConceptIntersections(edges, catalog, symbolToConcepts, conceptCatalog) {
  const intersections = [];
  const seenIntersections = new Set();

  for (const edge of edges) {
    const sourceConcepts = symbolToConcepts.get(edge.source);
    const targetConcepts = symbolToConcepts.get(edge.target);
    if (!sourceConcepts || !targetConcepts) continue;

    const sourceSym = catalog.get(edge.source);
    const targetSym = catalog.get(edge.target);

    for (const sConcept of sourceConcepts) {
      for (const tConcept of targetConcepts) {
        if (sConcept === tConcept) continue;

        const sortedPair = [sConcept, tConcept].sort().join('<->');
        const pairKey = `${sortedPair}:${edge.source}->${edge.target}`;
        if (seenIntersections.has(pairKey)) continue;
        seenIntersections.add(pairKey);

        const isCrossFile = Boolean(sourceSym && targetSym && sourceSym.file !== targetSym.file);

        intersections.push({
          concepts: [sConcept, tConcept],
          conceptNames: [conceptCatalog.get(sConcept).name, conceptCatalog.get(tConcept).name],
          isCrossFile,
          source: {
            id: edge.source,
            name: sourceSym ? sourceSym.name : edge.source,
            file: sourceSym ? sourceSym.file : 'unknown',
            line: edge.line || (sourceSym ? sourceSym.startLine : 1),
            concept: sConcept
          },
          target: {
            id: edge.target,
            name: targetSym ? targetSym.name : edge.target,
            file: targetSym ? targetSym.file : 'unknown',
            line: targetSym ? targetSym.startLine : 1,
            concept: tConcept
          },
          type: edge.type || 'call'
        });
      }
    }
  }

  // Prioritize cross-file subsystem boundaries over intra-file helper calls
  intersections.sort((a, b) => Number(b.isCrossFile) - Number(a.isCrossFile));

  return intersections;
}

/**
 * Resolves the effective taxonomy list from defaults, project config, and caller overrides.
 */
function resolveEffectiveTaxonomies(customTaxonomies = []) {
  const cfg = getProjectConfig();
  const configConcepts = (cfg && Array.isArray(cfg.concepts)) ? cfg.concepts : [];
  if (configConcepts.length > 0) {
    return [...configConcepts, ...customTaxonomies];
  }
  return [...DEFAULT_CONCEPT_TAXONOMIES, ...customTaxonomies];
}

/**
 * Builds the Concept Map and cross-concept call intersections from the symbol catalog and call graph.
 */
function buildConceptMap(blastIndex, customTaxonomies = []) {
  const taxonomies = resolveEffectiveTaxonomies(customTaxonomies);
  const conceptCatalog = initializeConceptCatalog(taxonomies);
  const symbolToConcepts = mapSymbolsToConcepts(blastIndex, conceptCatalog);
  const intersections = findConceptIntersections(
    blastIndex.edges,
    blastIndex.catalog,
    symbolToConcepts,
    conceptCatalog
  );

  return {
    catalog: conceptCatalog,
    symbolToConcepts,
    intersections
  };
}

/**
 * Scores a single symbol against query tokens.
 */
function scoreSymbolQueryMatch(sym, queryTokens) {
  const parentTokens = sym.parentClass ? tokenizeIdentifier(sym.parentClass) : [];
  const nameTokens = new Set([...tokenizeIdentifier(sym.name), ...parentTokens]);
  const fileTokens = new Set(tokenizeIdentifier(path.basename(sym.file || '')));
  const allTokens = collectSymbolTokens(sym);

  let score = 0;
  const matchedTerms = [];

  for (const qt of queryTokens) {
    if (nameTokens.has(qt)) {
      score += 3;
      matchedTerms.push(qt);
    } else if (fileTokens.has(qt)) {
      score += 2;
      matchedTerms.push(qt);
    } else if (allTokens.has(qt)) {
      score += 1;
      matchedTerms.push(qt);
    }
  }

  return { score, matchedTerms: Array.from(new Set(matchedTerms)) };
}

/**
 * Scores symbols in the catalog directly against query tokens (lexical & stemmed identifier match).
 */
function findDirectSymbolMatches(queryTokens, blastIndex) {
  if (!blastIndex || !blastIndex.catalog || queryTokens.length === 0) return [];
  const matches = [];

  for (const [id, sym] of blastIndex.catalog.entries()) {
    const { score, matchedTerms } = scoreSymbolQueryMatch(sym, queryTokens);
    if (score <= 0) continue;

    matches.push({
      id,
      name: sym.parentClass ? `${sym.parentClass}.${sym.name}` : sym.name,
      type: sym.type,
      file: sym.file,
      startLine: sym.startLine,
      endLine: sym.endLine,
      score,
      matchedTerms
    });
  }

  matches.sort((a, b) => b.score - a.score || a.startLine - b.startLine);
  return matches;
}

/**
 * Answers a natural-language human query by resolving concepts, likely subsystems, and code locations.
 */
function queryConcepts(queryString, conceptMap, blastIndex) {
  const queryTokens = tokenizeText(queryString);
  const matchedConcepts = [];

  for (const concept of conceptMap.catalog.values()) {
    const hits = [];
    for (const qt of queryTokens) {
      if (concept.keywords.includes(qt)) {
        hits.push(qt);
      }
    }

    if (hits.length > 0) {
      matchedConcepts.push({
        conceptId: concept.id,
        name: concept.name,
        category: concept.category,
        description: concept.description,
        matchedTokens: hits,
        weight: hits.length,
        governingFiles: Array.from(concept.files),
        governingEnums: concept.governingEnums,
        topSymbols: concept.symbols.slice(0, 5)
      });
    }
  }

  matchedConcepts.sort((a, b) => b.weight - a.weight || b.governingFiles.length - a.governingFiles.length);
  const matchedConceptIds = new Set(matchedConcepts.map(c => c.conceptId));

  const relevantIntersections = conceptMap.intersections
    .filter(inter => inter.concepts.some(c => matchedConceptIds.has(c)))
    .sort((a, b) => {
      const aMatchCount = (matchedConceptIds.has(a.concepts[0]) ? 1 : 0) + (matchedConceptIds.has(a.concepts[1]) ? 1 : 0);
      const bMatchCount = (matchedConceptIds.has(b.concepts[0]) ? 1 : 0) + (matchedConceptIds.has(b.concepts[1]) ? 1 : 0);
      if (bMatchCount !== aMatchCount) return bMatchCount - aMatchCount;
      return Number(b.isCrossFile) - Number(a.isCrossFile);
    });

  const directSymbolMatches = findDirectSymbolMatches(queryTokens, blastIndex);

  const fileScores = new Map();
  for (const c of matchedConcepts) {
    const conceptObj = conceptMap.catalog.get(c.conceptId);
    const totalConceptFileRank = c.governingFiles.length;
    c.governingFiles.forEach((f, idx) => {
      const rankBonus = Math.max(1, totalConceptFileRank - idx);
      const densityBonus = conceptObj && conceptObj.fileScores ? Math.min(5, conceptObj.fileScores.get(f) || 1) : 1;
      fileScores.set(f, (fileScores.get(f) || 0) + c.weight * 2 + Math.round((rankBonus + densityBonus) / 2));
    });
  }

  for (const sm of directSymbolMatches.slice(0, 25)) {
    if (sm.file) {
      fileScores.set(sm.file, (fileScores.get(sm.file) || 0) + sm.score);
    }
  }

  const prioritizedFiles = Array.from(fileScores.entries())
    .map(([file, score]) => ({
      file,
      layer: getLayerForFile(file),
      score
    }))
    .sort((a, b) => b.score - a.score);

  return {
    query: queryString,
    queryTokens,
    matchedConcepts,
    directSymbolMatches: directSymbolMatches.slice(0, 10),
    prioritizedFiles,
    relevantIntersections: relevantIntersections.slice(0, 10)
  };
}

module.exports = {
  stemWord,
  tokenizeIdentifier,
  tokenizeText,
  buildConceptMap,
  queryConcepts,
  DEFAULT_CONCEPT_TAXONOMIES
};
