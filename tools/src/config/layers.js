const fs = require('node:fs');
const path = require('node:path');

const JS_BUILTINS = new Set([
  'min', 'max', 'abs', 'floor', 'ceil', 'round', 'sqrt', 'sin', 'cos', 'atan2', 'tan', 'hypot', 'random',
  'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'filter', 'map', 'forEach', 'find', 'some', 'every',
  'reduce', 'indexOf', 'includes', 'join', 'concat', 'reverse', 'sort', 'split', 'trim', 'toLowerCase',
  'toUpperCase', 'startsWith', 'endsWith', 'replace', 'replaceAll', 'substring', 'charAt', 'charCodeAt',
  'log', 'warn', 'error', 'info', 'table', 'time', 'timeEnd', 'assert', 'trace',
  'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'cancelAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'now', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'stringify', 'parse', 'keys', 'values', 'entries', 'assign',
  'hasOwn', 'hasOwnProperty', 'toString', 'valueOf', 'bind', 'call', 'apply', 'flat', 'flatMap', 'at'
]);

const CANVAS_BUILTINS = new Set([
  'arc', 'beginPath', 'closePath', 'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect',
  'fillText', 'strokeText', 'measureText', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo',
  'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'resetTransform', 'clip',
  'createLinearGradient', 'createRadialGradient', 'drawImage', 'putImageData', 'getImageData',
  'setLineDash', 'getLineDash', 'createPattern'
]);

const DOM_BUILTINS = new Set([
  'getElementById', 'querySelector', 'querySelectorAll', 'createElement', 'appendChild',
  'removeChild', 'replaceChild', 'setAttribute', 'getAttribute', 'removeAttribute', 'hasAttribute',
  'addEventListener', 'removeEventListener', 'focus', 'blur', 'click', 'getBoundingClientRect',
  'classList', 'style', 'innerHTML', 'textContent', 'value'
]);

const AUDIO_BUILTINS = new Set([
  'createOscillator', 'createGain', 'setValueAtTime', 'linearRampToValueAtTime',
  'exponentialRampToValueAtTime', 'connect', 'disconnect', 'start', 'stop'
]);

const LIFECYCLE_NAMES = new Set(['constructor', 'update', 'draw', 'render', 'destroy', 'init']);

const DEFAULT_LAYERS = {
  'Presentation': ['UI.js', 'Renderer.js'],
  'Simulation': ['Simulation.js', 'CampaignManager.js', 'MissionContracts.js', 'GalaxyEconomy.js'],
  'AI & Guidance': ['CombatAI.js', 'FormationManager.js', 'TacticsManager.js', 'WaypointSystem.js'],
  'Entities & Physics': ['Ship.js', 'CapitalShip.js', 'GalaxyShips.js', 'Weapons.js', 'Asteroid.js', 'Particle.js'],
  'Story & Narrative': ['StoryEngine.js', 'StoryDataRegistry.js', 'StoryEvents.js', 'FactionManager.js', 'CommsDirector.js'],
  'Infrastructure': ['Math2D.js', 'Config.js', 'GalaxyConfig.js', 'Logger.js', 'SignalBus.js', 'StateMachine.js', 'GameState.js']
};

const LAYER_RANKS = {
  'Presentation': 1,
  'Presentation / Exporters': 2,
  'Application / Controllers': 2,
  'Simulation': 2,
  'Story & Narrative': 2,
  'AI & Guidance': 3,
  'Domain Services': 3,
  'Domain Logic': 3,
  'Entities & Physics': 4,
  'Domain Entities & Metrics': 4,
  'Infrastructure': 5
};

// General heuristics for standard codebases based on directory structure and file conventions
const GENERAL_PATH_PATTERNS = [
  { pattern: /(?:^|[/\\])(?:cli|bin|ui|views|components|pages|frontend)(?:[/\\]|$)|(?:^|[/\\])(?:tools[/\\])?(?:ast-outline|ast-inspect|cli)\.js$|^(?:tools[/\\])?conversation-analyzer\.js$/i, layer: 'Presentation' },
  { pattern: /(?:^|[/\\])(?:commands|controllers|routes|api|endpoints)(?:[/\\]|$)/i, layer: 'Application / Controllers' },
  { pattern: /(?:^|[/\\])(?:exporters|reports|formatters|html-reporter)(?:\.js|[/\\]|$)/i, layer: 'Presentation / Exporters' },
  { pattern: /(?:^|[/\\])(?:graph|services|simulation|workflows|usecases|engine|conversation)(?:[/\\]|$)/i, layer: 'Domain Services' },
  { pattern: /(?:^|[/\\])(?:metrics[/\\](?:cyclomatic|cognitive)|infrastructure|db|repository|storage|network|utils|helpers|config|lib|parser|vcs|cache|telemetry)(?:\.js|[/\\]|$)/i, layer: 'Infrastructure' },
  { pattern: /(?:^|[/\\])(?:metrics|scoring|rules|models|entities|domain|schema)(?:[/\\]|$)/i, layer: 'Domain Entities & Metrics' }
];

const CONFIG_FILENAMES = [
  'codereview.config.js',
  'codereview.config.json',
  '.codereviewrc.json',
  '.codereview.json'
];

let cachedProjectConfig = null;

/**
 * Walks upward from a starting file or directory to discover the enclosing project root.
 * Prioritizes directories with a codereview config file, then package.json or .git.
 *
 * @param {string} [startPath] - Starting file or directory path
 * @returns {string} Resolved project root directory
 */
function findProjectRoot(startPath = process.cwd()) {
  let current = path.resolve(startPath);
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }
  const initialDir = current;
  let fallbackVcsRoot = null;

  while (true) {
    for (const cfg of CONFIG_FILENAMES) {
      if (fs.existsSync(path.join(current, cfg))) {
        return current;
      }
    }
    if (!fallbackVcsRoot && (fs.existsSync(path.join(current, 'package.json')) || fs.existsSync(path.join(current, '.git')))) {
      fallbackVcsRoot = current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return fallbackVcsRoot || initialDir;
}

/**
 * Searches for and loads optional project-specific architectural configuration.
 * Supported filenames: codereview.config.js, codereview.config.json, .codereviewrc.json
 * 
 * @param {string} rootDir - Base directory to search
 * @returns {Object|null} Parsed configuration object if found
 */
function loadProjectConfig(rootDir = process.cwd()) {
  const searchDirs = [path.resolve(rootDir)];
  const discoveredRoot = findProjectRoot(rootDir);
  if (!searchDirs.includes(discoveredRoot)) {
    searchDirs.push(discoveredRoot);
  }

  for (const dir of searchDirs) {
    for (const name of CONFIG_FILENAMES) {
      const configPath = path.resolve(dir, name);
      if (fs.existsSync(configPath)) {
        try {
          if (configPath.endsWith('.js')) {
            delete require.cache[require.resolve(configPath)];
            cachedProjectConfig = require(configPath);
          } else {
            cachedProjectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          }
          return cachedProjectConfig;
        } catch (err) {
          console.warn(`Warning: Could not load configuration from ${configPath}:`, err.message);
        }
      }
    }
  }

  cachedProjectConfig = null;
  return null;
}

/**
 * Returns the currently loaded project configuration, if any.
 */
function getProjectConfig() {
  return cachedProjectConfig;
}

/**
 * Returns merged layer ranks combining built-in ranks and optional custom config overrides.
 */
function getEffectiveLayerRanks(customConfig = cachedProjectConfig) {
  if (customConfig && customConfig.layerRanks && typeof customConfig.layerRanks === 'object') {
    return { ...LAYER_RANKS, ...customConfig.layerRanks };
  }
  return LAYER_RANKS;
}

/**
 * Resolves detailed classification information for a file path.
 *
 * @param {string} filePath - Path to source file
 * @param {Object} [customConfig] - Optional custom config overrides
 * @returns {{ layer: string, source: 'config'|'default_layers'|'heuristic'|'fallback_unclassified', rule?: string }}
 */
function getLayerDetails(filePath, customConfig = cachedProjectConfig) {
  const normalized = filePath.replace(/\\/g, '/');
  const base = path.basename(filePath);

  // 1. Check custom config if provided
  if (customConfig && customConfig.layers) {
    for (const [layerName, rules] of Object.entries(customConfig.layers)) {
      if (Array.isArray(rules)) {
        if (rules.some(r => {
          if (r.includes('/') || r.includes('\\')) {
            const normR = r.replace(/\\/g, '/');
            return normalized === normR || normalized.endsWith('/' + normR);
          }
          return base === r || normalized.split('/').includes(r);
        })) {
          return { layer: layerName, source: 'config', rule: layerName };
        }
      }
    }
  }

  // 2. Check explicit DEFAULT_LAYERS (preserves backward compatibility)
  for (const [layer, files] of Object.entries(DEFAULT_LAYERS)) {
    if (files.includes(base)) return { layer, source: 'default_layers', rule: layer };
  }

  // 3. Check general directory heuristics for any codebase
  for (const { pattern, layer } of GENERAL_PATH_PATTERNS) {
    if (pattern.test(normalized)) {
      return { layer, source: 'heuristic', rule: pattern.toString() };
    }
  }

  // 4. Default fallback
  return { layer: 'Domain Logic', source: 'fallback_unclassified' };
}

/**
 * Maps a file path to its architectural subsystem layer.
 * 
 * Priority:
 * 1. Project config layer mappings (if configured)
 * 2. Explicit legacy DEFAULT_LAYERS (filename exact match)
 * 3. General architectural directory heuristics (Presentation -> Application -> Domain -> Infrastructure)
 * 4. Fallback to 'Domain Logic'
 * 
 * @param {string} filePath - Path to source file
 * @param {Object} [customConfig] - Optional custom config overrides
 * @returns {string} Layer name
 */
function getLayerForFile(filePath, customConfig = cachedProjectConfig) {
  return getLayerDetails(filePath, customConfig).layer;
}

const STANDARD_ARCHITECTURAL_LAYERS = [
  'Presentation',
  'Application / Controllers',
  'Presentation / Exporters',
  'Domain Services',
  'Domain Entities & Metrics',
  'Infrastructure'
];

/**
 * Returns effective architectural subsystems list from project config or standard architectural defaults.
 */
function getEffectiveSubsystems(customConfig = cachedProjectConfig) {
  if (customConfig && customConfig.layers && typeof customConfig.layers === 'object') {
    return Object.keys(customConfig.layers);
  }
  return STANDARD_ARCHITECTURAL_LAYERS;
}

module.exports = {
  JS_BUILTINS,
  CANVAS_BUILTINS,
  DOM_BUILTINS,
  AUDIO_BUILTINS,
  LIFECYCLE_NAMES,
  DEFAULT_LAYERS,
  STANDARD_ARCHITECTURAL_LAYERS,
  LAYER_RANKS,
  findProjectRoot,
  getLayerForFile,
  getLayerDetails,
  loadProjectConfig,
  getProjectConfig,
  getEffectiveLayerRanks,
  getEffectiveSubsystems
};
