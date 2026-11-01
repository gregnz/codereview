const fs = require('node:fs');
const path = require('node:path');

/**
 * Built-in skill definitions covering core Antigravity & Agent Skills.
 * Workspace skills will override or supplement these.
 */
const BUILTIN_SKILLS = [
  {
    id: 'codereview-analyzer',
    name: 'Code Review AST & Multi-Hop Blast Radius Analyzer',
    description: 'MANDATORY FIRST STEP for bug investigation ("analyse and remediate"), root-cause analysis, code navigation, symbol/caller lookup, human concept map queries, complexity hotspot detection, blast radius indexing, and architecture Graph IR exports.',
    path: path.resolve(__dirname, '../../../.agents/skills/codereview-analyzer/SKILL.md'),
    triggers: [
      'ast', 'blast radius', 'cognitive complexity', 'cyclomatic', 'concept',
      'call graph', 'symbol map', 'layer violation', 'hotspot', 'code review',
      'graph.json', 'ast-inspect', 'ast-outline', 'enemy ships crash into friendly',
      'analyse', 'analyze', 'remediate', 'bug', 'investigate', 'refactor',
      'mission', 'controller', 'contract', 'waypoint', 'codereview-analyzer'
    ],
    prescribedTools: [
      'tools/ast-inspect.js',
      'tools/ast-outline.js',
      'ast-inspect.js',
      'ast-outline.js',
      'run-analyzer.sh',
      'npm run inspect',
      'npm run analyze',
      'npm run analyze:map',
      'npm run analyze:graph',
      'npm run analyze:d3',
      'npm run lint',
      'npm run ast'
    ],
    antiPatterns: [
      {
        pattern: /node\s+(-e|--eval)\s+['"].*(require\(|graph|nodes|edges|blastRadius|cognitiveComplexity).*['"]/i,
        reason: 'DO NOT write ad-hoc JavaScript (`node -e "..."`) to parse graph JSON or probe module exports. Use `node tools/ast-inspect.js`, `node tools/ast-outline.js --query`, or unit tests instead.'
      },
      {
        pattern: /ast-outline\.js\s+(\.|\.\/)\s/i,
        reason: 'Target Scoping Rule: When analyzing the codereview codebase itself, ALWAYS specify `tools` instead of `.` to avoid traversing hooks, vendor files, and data.js.'
      },
      {
        pattern: /(grep|ripgrep|rg|grep_search)\s+.*(crash|hostile|friendly|combat|steering|loadContracts|getContracts|availableContracts|generateBoardForPort|resolveWaypointTarget|setMissionRoute)/i,
        reason: 'Avoid blind grep / regex searches for domain concepts or guessed method names across source files. Use `node tools/ast-inspect.js --concept "<query>"` or `node tools/ast-outline.js <dir> --query "<pattern>"`.'
      }
    ]
  },
  {
    id: 'test-driven-development',
    name: 'Test-Driven Development (TDD)',
    description: 'Drives development with tests. Use when implementing any logic, fixing any bug, or changing any behavior.',
    triggers: [
      'test', 'unit test', 'tdd', 'test suite', 'failing test', 'spec', 'regression', 'verify behavior'
    ],
    prescribedTools: [
      'npm test',
      'node --test',
      'test/**/*.test.js'
    ],
    antiPatterns: [
      {
        pattern: /modify.*without test|bypass.*test/i,
        reason: 'Implementing non-trivial feature or bug fix without adding or executing unit tests.'
      }
    ]
  },
  {
    id: 'debugging-and-error-recovery',
    name: 'Systematic Debugging & Error Recovery',
    description: 'Guides systematic root-cause debugging when tests fail, builds break, behavior does not match expectations, or errors occur.',
    triggers: [
      'error', 'failed', 'exception', 'stack trace', 'operation not permitted',
      'exit code 1', 'cannot find module', 'debugging', 'unhandled rejection'
    ],
    prescribedTools: [
      'check task logs',
      'inspect error context',
      'verify file permissions or paths',
      'systematic root cause analysis'
    ],
    antiPatterns: [
      {
        pattern: /retry_identical_failed_command/i,
        reason: 'Repeated identical command without investigating root cause or modifying parameters.'
      }
    ]
  },
  {
    id: 'git-workflow-and-versioning',
    name: 'Git Workflow & Versioning',
    description: 'Structures git workflow practices. Use when committing, branching, resolving conflicts, or checking status.',
    triggers: [
      'git status', 'git diff', 'git commit', 'git branch', 'git checkout', 'merge conflict', 'pull request'
    ],
    prescribedTools: [
      'git status',
      'git diff'
    ],
    antiPatterns: []
  },
  {
    id: 'code-review-and-quality',
    name: 'Code Review & Quality Assurance',
    description: 'Conducts multi-axis code review across correctness, readability, architecture, security, and performance.',
    triggers: [
      'code review', 'code quality', 'smell', 'refactor check', 'review changes', 'pr review'
    ],
    prescribedTools: [
      'npm run analyze:lint',
      'node tools/ast-inspect.js --section hotspots'
    ],
    antiPatterns: []
  },
  {
    id: 'code-simplification',
    name: 'Code Simplification',
    description: 'Simplifies code for clarity without altering behavior. Used when refactoring complex modules.',
    triggers: [
      'simplify', 'reduce complexity', 'clean up', 'refactor code', 'high cognitive complexity'
    ],
    prescribedTools: [
      'node tools/ast-inspect.js --section cognitive'
    ],
    antiPatterns: []
  },
  {
    id: 'biomolecular-structure-viewer',
    name: 'Biomolecular Structure Viewer',
    description: 'Interactive 3D biomolecular structure viewer via Mol*. Renders 3D structures from .cif, .mmcif, .pdb.',
    triggers: [
      'pdb', '.pdb', 'cif', '.cif', 'mmcif', '.mmcif', 'protein structure', 'alphafold', 'mol*', 'molstar', 'biomolecular viewer'
    ],
    prescribedTools: [
      'science_biomolecular_structure_viewer_mcp',
      'sidecar://'
    ],
    antiPatterns: [
      {
        pattern: /generate static image of protein/i,
        reason: 'Always prefer the interactive Mol* sidecar viewer over static image generation for biomolecules.'
      }
    ]
  },
  {
    id: 'modern-web-guidance',
    name: 'Modern Web Guidance',
    description: 'MANDATORY for all HTML/CSS and client-side JS tasks: View Transitions, anchor positioning, container queries, CWV.',
    triggers: [
      'html', 'css', 'style', 'dom', 'dialog', 'modal', 'popover', 'container query',
      'responsive ui', 'web layout', 'canvas', 'svg', 'd3 visualization'
    ],
    prescribedTools: [
      'modern web guidelines',
      'semantic html'
    ],
    antiPatterns: []
  },
  {
    id: 'browser-testing-with-devtools',
    name: 'Browser Testing with Chrome DevTools',
    description: 'Tests in real browsers via Chrome DevTools MCP. Inspect DOM, capture console errors, profile performance.',
    triggers: [
      'devtools', 'browser testing', 'console error', 'inspect dom', 'chrome automation'
    ],
    prescribedTools: [
      'chrome-devtools MCP'
    ],
    antiPatterns: []
  },
  {
    id: 'spec-driven-development',
    name: 'Spec-Driven Development',
    description: 'Creates specs before coding. Use when starting a new project, feature, or significant change.',
    triggers: [
      'specification', 'spec', 'requirements', 'rfp', 'proposal', 'design doc'
    ],
    prescribedTools: [],
    antiPatterns: []
  },
  {
    id: 'planning-and-task-breakdown',
    name: 'Planning & Task Breakdown',
    description: 'Breaks work into ordered tasks before execution.',
    triggers: [
      'planning', 'task list', 'milestone', 'phases', 'break down'
    ],
    prescribedTools: [],
    antiPatterns: []
  }
];

/**
 * Parses frontmatter and key sections from a markdown file (SKILL.md).
 */
function parseSkillMarkdown(content, filePath) {
  let name = path.basename(path.dirname(filePath));
  let description = '';
  let antiPatterns = [];
  let prescribedTools = [];

  // Match YAML frontmatter
  const fmMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
  if (fmMatch) {
    const yaml = fmMatch[1];
    const nameMatch = yaml.match(/^name:\s*(.+)$/m);
    if (nameMatch) name = nameMatch[1].trim();

    const descMatch = yaml.match(/^description:\s*(?:>-\s*|\s*)([\s\S]*?)(?=\n\w+:|$)/m);
    if (descMatch) {
      description = descMatch[1].replace(/\n\s+/g, ' ').trim();
    }
  }

  // Look for CAUTION or DO NOT blocks
  const cautionMatches = content.matchAll(/>\s*\[!CAUTION\][\s\S]*?>\s*\*\*([^*]+)\*\*[\s\S]*?>\s*([^>\n]+)/gi);
  for (const m of cautionMatches) {
    const reason = `${m[1]}: ${m[2]}`.trim();
    if (/node\s+-e/i.test(reason)) {
      antiPatterns.push({
        pattern: /node\s+(-e|--eval)\s+['"].*(require|JSON|graph)/i,
        reason
      });
    }
  }

  // Extract command block examples
  const bashBlocks = content.matchAll(/```bash\s*([\s\S]*?)```/g);
  for (const block of bashBlocks) {
    const lines = block[1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    for (const line of lines) {
      if (line.startsWith('node ') || line.startsWith('npm run ')) {
        const cmd = line.split(' ')[0] + ' ' + (line.split(' ')[1] || '');
        if (!prescribedTools.includes(cmd)) {
          prescribedTools.push(cmd);
        }
      }
    }
  }

  return {
    id: name,
    name,
    description,
    path: filePath,
    prescribedTools,
    antiPatterns
  };
}

/**
 * Loads and merges a single skill definition from its directory.
 */
function loadSkillFromDir(workspaceSkillsDir, entryName, skillsMap) {
  const skillFile = path.join(workspaceSkillsDir, entryName, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return;

  try {
    const content = fs.readFileSync(skillFile, 'utf8');
    const parsed = parseSkillMarkdown(content, skillFile);
    const existing = skillsMap.get(parsed.id);

    if (existing) {
      // Merge with existing built-in to keep rich triggers while updating path
      skillsMap.set(parsed.id, {
        ...existing,
        ...parsed,
        path: skillFile,
        triggers: Array.from(new Set([...(existing.triggers || []), ...(parsed.triggers || [])])),
        antiPatterns: [...(existing.antiPatterns || []), ...(parsed.antiPatterns || [])],
        prescribedTools: Array.from(new Set([...(existing.prescribedTools || []), ...(parsed.prescribedTools || [])]))
      });
    } else {
      skillsMap.set(parsed.id, {
        ...parsed,
        triggers: [parsed.id, ...parsed.name.toLowerCase().split(/\s+/)]
      });
    }
  } catch {
    // ignore parse errors for non-conforming skills
  }
}

/**
 * Discovers skills from workspace and system paths.
 */
function discoverSkills(options = {}) {
  const skillsMap = new Map();

  // 1. Seed with built-ins
  for (const skill of BUILTIN_SKILLS) {
    skillsMap.set(skill.id, { ...skill });
  }

  // 2. Scan workspace directory
  const workspaceSkillsDir = options.workspaceSkillsDir || path.resolve(process.cwd(), '.agents/skills');
  if (!fs.existsSync(workspaceSkillsDir)) {
    return Array.from(skillsMap.values());
  }

  try {
    const entries = fs.readdirSync(workspaceSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        loadSkillFromDir(workspaceSkillsDir, entry.name, skillsMap);
      }
    }
  } catch {
    // workspace directory access error
  }

  return Array.from(skillsMap.values());
}

module.exports = {
  BUILTIN_SKILLS,
  parseSkillMarkdown,
  discoverSkills
};
