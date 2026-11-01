---
name: codereview-analyzer
description: >-
  MANDATORY FIRST STEP for bug investigation ("analyse and remediate"), root-cause debugging,
  code navigation, symbol/caller lookup, feature implementation, refactoring, and static code
  review on any JavaScript/TypeScript codebase. Use BEFORE running grep or regex search whenever
  asked to debug application issues, trace data-to-code flows, locate functions/classes/enums,
  check blast radius before edits, verify diffs after edits, or inspect domain concepts,
  complexity scorecards, symbol maps, and Graph IR exports.
---

# Code Review AST, Concept Routing & Blast Radius Skill

This skill provides mandatory execution protocols and zero-friction commands for the **Code Review AST Outline, Multi-Hop Blast Radius Analyzer & Hybrid Concept/Symbol Engine** (`tools/ast-outline.js` and `tools/ast-inspect.js`).

---

## Mandatory 3-Phase Agent Execution Protocol

Whenever investigating a bug, implementing a feature, or refactoring code in any target project, follow this 3-phase lifecycle instead of blind regex searching:

### Phase 1: Zero-Grep Discovery & Bug Routing (Do This FIRST)

Before reading full source files or running regex searches across source code:

```bash
# Unified CLI command (auto-detects project root & uses <10ms cache when fresh):
codereview concept "<bug report, tuning intent, or parameter>" [targetDir]
codereview query "<symbol1|symbol2|pattern>" [targetDir]  # Accepts regex, or "class UserService", "function calculateTotal"

# Direct node invocation fallback (if 'codereview' is not in PATH):
node /Users/gregday/projects/codereview/tools/cli.js concept "<bug report or domain intent>" [targetDir]
node /Users/gregday/projects/codereview/tools/cli.js query "<symbol1|symbol2|pattern>" [targetDir]

# If a query returns 0 results or unhelpful matches:
# 1. The failure is automatically logged to .codereview/feedback.jsonl.
# 2. DO NOT fall back to grep. Try broader root tokens: codereview query "RootTokenA|RootTokenB"
# 3. Log discovered domain synonyms:
codereview feedback "Searched for <intent>; found in <File.symbol>" --query "<intent>"

# 4. Analyze friction clusters and update domain routing:
codereview improve [targetDir]
codereview improve --apply [targetDir]
```

> [!CAUTION]
> **Anti-Pattern Loopholes to Avoid:**
> 1. **Native Search Tool Equivalence**: The rule against blind `grep` on source files applies equally to IDE/agent native search tools (`Search files for regex`, `grep_search`, `ripgrep`). Never guess method names with regex alternation (e.g. `getUser|fetchUser|loadUser`) across `.js`/`.ts` files — run `codereview query "User|Account|Auth"` or `codereview concept` to get exact symbol names, `[Lstart-Lend]` line bounds, caller counts, and risk ratings in one call.
> 2. **The Data-to-Code Bridge Rule**: Searching static data files (`.json`, `.yaml`) for a literal content string (e.g. `"Enterprise Plan"` ➔ `plan_enterprise_v2`) is fine ONLY to identify the data ID. **The moment you transition from a data key to tracing how code loads, filters, spawns, or processes it**, STOP grepping and switch to `codereview concept` or `codereview query` on the source AST or `ast_graph.json`.
> 3. **No Ad-Hoc `node -e` Probing**: Do NOT write ad-hoc `node -e "const r = require(...)"` scripts to inspect module exports, registries, or graph JSON. Use `codereview query`, `codereview concept`, or unit tests (`node --test`).
> 4. **No Silent Failure Fallbacks**: If a query or concept lookup yields empty results, do not silently switch to grep. Run `codereview improve` or record the missing synonym via `codereview feedback`.

### Phase 2: Pre-Edit Blast Radius Check (Before Modifying Code)

Before changing the behavior, signature, or structure of any function, method, class, or enum, check its direct callers and multi-hop reachability:

```bash
# Accepts bare symbol name, Class.method, Class#method, or file#symbol
codereview blast "<symbol_or_Class.method>" [targetDir]
# or: node /Users/gregday/projects/codereview/tools/cli.js blast "<symbol_or_Class.method>" [targetDir]
```

- **`CRITICAL HOTSPOT` / `HIGH`**: Preserve backward-compatible parameters and verify all `directCallers`.
- **`LOW` / `ISOLATED`**: Localized impact; safe to refactor.

### Phase 3: Post-Edit Verification & Artifact Sync (After Modifying Code)

After editing source files and before declaring the task complete:

```bash
# Recommended All-in-One Lifecycle Command:
# Synchronizes symbol maps & graph IR, verifies architectural layers, and checks git diff blast radius in ONE step:
codereview verify [targetDir]
# or: node /Users/gregday/projects/codereview/tools/cli.js verify [targetDir]
# or: node /Users/gregday/projects/codereview/tools/ast-outline.js [targetDir] --verify

# If an architectural layer violation flags a newly introduced file:
codereview classify <filePath> "<LayerName>"
# e.g.: codereview classify "src/services/AuthService.js" "Domain Services"

# Or execute individual steps manually:
# 1. Verify modified AST symbols and their impacted callers against git diff
codereview diff [ref]
# or: node /Users/gregday/projects/codereview/tools/cli.js diff

# 2. Verify no new monolithic functions, deep nesting (>4), cycles, or layer breaches were introduced
codereview lint [targetDir]
# or: node /Users/gregday/projects/codereview/tools/cli.js lint

# 3. Synchronize committed AST artifacts (ast_symbol_map.md and ast_graph.json)
codereview sync [targetDir]
# or: node /Users/gregday/projects/codereview/tools/ast-outline.js [targetDir] --sync
```

---

## Fast Track Commands (Zero Grepping)

To run the complete analysis suite on the `codereview` codebase without digging through scripts:

```bash
# Option 1: Using npm script
npm run analyze

# Option 2: Using the skill's executable runner script
./.agents/skills/codereview-analyzer/scripts/run-analyzer.sh tools all

# Query human-level concepts & direct symbol matches (NO grep or blind search required)
node tools/ast-inspect.js --concept "complexity hotspots and blast radius"
node tools/ast-inspect.js --concept "ast parsing call graph dependency cycles"
# or via live AST:
node tools/ast-outline.js tools --concept "complexity hotspots and blast radius"

# Multi-symbol regex lookup (returns exact Lstart-Lend ranges, callers, and blast risk)
node tools/ast-inspect.js --query "queryConcepts|evaluateSkillAdherence|parseTranscript"
node tools/ast-outline.js tools --query "queryConcepts|evaluateSkillAdherence"

# Inspect top complexity & blast radius metrics (NO node -e scripting required)
npm run inspect
# or: node tools/ast-inspect.js codereview_graph.json

# Analyze Gemini conversation (.jsonl or .md transcript) & track agent skill adherence
npm run conversation
node tools/conversation-analyzer.js /path/to/transcript.md
# or export interactive HTML dashboard:
node tools/conversation-analyzer.js --html
```

To run tests:
```bash
npm test
```

To view the visualization in your browser:
```bash
npm run open
```

---

## Sharing Across Projects (Using from Any Workspace)

To use this analyzer across multiple repositories without duplicating skill files, use one of these single-source configurations:

### Option A: Global Skill (Recommended — Works in all workspaces)
Antigravity automatically discovers skills in `~/.gemini/config/skills/`. Creating a symlink there exposes the analyzer to **every** workspace on your machine:

```bash
# 1. Ensure global skills directory exists
mkdir -p ~/.gemini/config/skills

# 2. Symlink this skill into the global config
ln -sfn /Users/gregday/projects/codereview/.agents/skills/codereview-analyzer ~/.gemini/config/skills/codereview-analyzer
```

Once linked, Antigravity recognizes `codereview-analyzer` in any project workspace automatically.

### Option B: Workspace Symlink in Target Project
Link directly inside any target project workspace:

```bash
mkdir -p /path/to/target-project/.agents/skills
ln -sfn /Users/gregday/projects/codereview/.agents/skills/codereview-analyzer /path/to/target-project/.agents/skills/codereview-analyzer
```

### Option C: Explicit Registration via `skills.json`
In `/path/to/target-project/.agents/skills.json`:

```json
{
  "skills": [
    {
      "name": "codereview-analyzer",
      "path": "/Users/gregday/projects/codereview/.agents/skills/codereview-analyzer"
    }
  ]
}
```

---

## Executing on any Arbitrary Codebase or Directory

You can run the analyzer on any target project or directory (either absolute path or relative):

> [!IMPORTANT]
> **Sandbox Isolation Rule for External Projects:**
> When running the analyzer from an external project workspace, the script `/Users/gregday/projects/codereview/tools/ast-outline.js` (or global `codereview` binary) resides outside that workspace. If the standard sandbox blocks execution with an isolation permission error, **agents must execute the command with `BypassSandbox: true`**.

### 1. Run Complete Analysis Suite on an External Directory
```bash
# Primary: Using the unified codereview CLI
codereview verify /path/to/target-project/src

# Or using the skill's runner script (automatically resolves canonical paths)
/Users/gregday/projects/codereview/.agents/skills/codereview-analyzer/scripts/run-analyzer.sh /path/to/target-project/src all

# Or export Graph IR & sync with D3 visual workbench (index.html)
/Users/gregday/projects/codereview/.agents/skills/codereview-analyzer/scripts/run-analyzer.sh /path/to/target-project/src sync
```

### 2. Query Human Concepts & Symbols on External Projects (Zero Grepping)
When investigating bugs like *"session token expires prematurely during checkout"* or *"discount calculation applied twice on retry"*:

```bash
# Option A: Instant query against precomputed ast_graph.json (<10ms, no Tree-Sitter re-parse)
node /Users/gregday/projects/codereview/tools/ast-inspect.js /path/to/target-project/ast_graph.json --concept "session token expiration checkout"
node /Users/gregday/projects/codereview/tools/ast-inspect.js /path/to/target-project/ast_graph.json --query "authenticateUser|validateSession|refreshToken"

# Option B: Query live AST of the target codebase
node /Users/gregday/projects/codereview/tools/ast-outline.js /path/to/target-project/src --concept "session token expiration checkout"
node /Users/gregday/projects/codereview/tools/ast-outline.js /path/to/target-project/src --query "authenticateUser|validateSession|refreshToken"

# Option C: Using the runner script or CLI
codereview concept "session token expiration checkout" /path/to/target-project/src
codereview query "authenticateUser|validateSession" /path/to/target-project/src
# or:
/Users/gregday/projects/codereview/.agents/skills/codereview-analyzer/scripts/run-analyzer.sh /path/to/target-project/src concept "session token expiration checkout"
/Users/gregday/projects/codereview/.agents/skills/codereview-analyzer/scripts/run-analyzer.sh /path/to/target-project/src query "authenticateUser|validateSession"
```

### 3. Run Individual Analyzer Modes on External Projects
```bash
# Pre-edit blast radius check for a method or function
node /Users/gregday/projects/codereview/tools/ast-outline.js /path/to/target-project/src --blast-radius "AuthService.validateSession"
# or: codereview blast "AuthService.validateSession" /path/to/target-project/src

# Post-edit git diff blast radius verification
node /Users/gregday/projects/codereview/tools/ast-outline.js /path/to/target-project/src --diff
# or: codereview diff HEAD /path/to/target-project/src

# Architecture & complexity lint on external project
node /Users/gregday/projects/codereview/tools/ast-outline.js /path/to/target-project/src --lint
# or: codereview lint /path/to/target-project/src

# Generate markdown symbol map with blast radius & concept index
node /Users/gregday/projects/codereview/tools/ast-outline.js /path/to/target-project/src --write-map /path/to/target-project/ast_symbol_map.md

# Export standalone Graph IR to JSON
node /Users/gregday/projects/codereview/tools/ast-outline.js /path/to/target-project/src --export-graph /path/to/target-project/ast_graph.json
```

### 4. Optional Project-Specific Layer Configuration
Target projects can define custom architectural layers and rules by placing a `codereview.config.json` in their root directory:
```json
{
  "layers": {
    "Presentation": ["views", "controllers", "ui"],
    "Application": ["commands", "handlers", "workflows"],
    "Domain Services": ["services", "models", "domain"],
    "Infrastructure": ["storage", "network", "db", "utils"]
  }
}
```
If no config file exists, the analyzer automatically applies standard directory heuristics (`views/`, `controllers/`, `services/`, `models/`, `utils/`, etc.).

---

## Analysis Suite Modes & Commands

The code review analyzer CLI is located at `tools/ast-outline.js`. It parses files using Tree-Sitter GLR parsers, builds a call graph, computes Chidamber & Kemerer OO metrics, calculates multi-hop blast radiuses, validates architectural layers, builds human concept maps, and detects circular dependency cycles.

> [!IMPORTANT]
> **Target Scoping Rule:**
> When analyzing the **codereview codebase itself**, ALWAYS specify `tools` as the target path (`tools/ast-outline.js tools ...`).
> Do NOT specify `.` directly without recognizing that `.` traverses `.agents/` hooks, `vendor/d3.min.js`, and generated `data.js`.

### 1. Human Concept Map & Domain Bug Routing (Zero Grepping)
When faced with domain-level problem statements (e.g. *"session expires prematurely during checkout"*, *"order discount calculation applied twice"*, *"high cognitive complexity in graph builder"*), query the concept engine directly:

```bash
# Query against existing graph JSON (instant lookup)
node tools/ast-inspect.js --concept "session authentication token expiration"
node tools/ast-inspect.js --concept "order payment discount calculation" --json

# Query against live AST directory
node tools/ast-outline.js tools --concept "complexity hotspots and blast radius"
node tools/ast-outline.js /path/to/project --concept "session timeout authentication"
```

The concept resolver will:
1. Deconstruct natural language tokens (`session`, `auth`, `token`, `checkout`)
2. Match them to domain taxonomies and code concepts (Authentication, Session Management, Payment, Workflows)
3. Rank likely governing files and state enums
4. Surface **Cross-Concept Intersections** (e.g. where session middleware invokes token refresh logic)
5. Provide a primary diagnostic hypothesis for the AI agent

### 2. Architecture & Complexity Scorecard (Lint)
Scans for monolithic functions/methods (high LOC), deeply nested blocks (>4 levels), architectural layer boundary breaches, and circular dependency loops.

```bash
# Via npm
npm run analyze:lint

# Direct CLI
node tools/ast-outline.js tools --lint

# External project
node tools/ast-outline.js /path/to/project --lint
```

### 3. AST Symbol Map & Multi-Hop Blast Radius Index
Generates a markdown symbol outline with full layer classification, class hierarchy, method sets, caller counts, transitive blast radius risk scores, and the **Domain Concept & Intent Routing Index** at the top.

```bash
# Via npm (writes to codereview_symbol_map.md)
npm run analyze:map

# Direct CLI
node tools/ast-outline.js tools --write-map codereview_symbol_map.md

# External project
node tools/ast-outline.js /path/to/project --write-map ast_symbol_map.md
```

### 4. Graph IR Export (JSON & D3 Workbench Data)
Generates the unified Graph IR format (`nodes` with metrics + `edges` with call/extension types + `concepts` and `conceptIntersections`).

```bash
# Standalone codereview graph export (codereview_graph.json)
npm run analyze:graph
# Direct: node tools/ast-outline.js tools --export-graph codereview_graph.json

# Visual explorer export (graph.json and data.js for index.html)
npm run analyze:d3
# Direct: node tools/ast-outline.js tools --export-graph graph.json

# External project export for visualization
node tools/ast-outline.js /path/to/target-project/src --export-graph graph.json
```

### 5. Single-Symbol Inspection & Queries
Query specific functions, inspect blast radius, or generate Mermaid diagrams:

```bash
# Calculate blast radius for a specific symbol
node tools/ast-outline.js tools --blast-radius "tools/ast-outline.js#resolveTargetDirectory"

# Query symbols matching a name pattern
node tools/ast-outline.js tools --query "exportGraph"

# Output Mermaid dependency diagram for a symbol
node tools/ast-outline.js tools --mermaid "tools/ast-outline.js#main"

# Intersect blast radius with git diff
node tools/ast-outline.js tools --diff HEAD
```

### 6. Metrics Inspection & Diagnostic Summary (Zero JavaScript Scripting)

> [!CAUTION]
> **DO NOT write ad-hoc JavaScript (`node -e '...'`) to parse or summarize graph JSON.**
> Use `node tools/ast-inspect.js` or `npm run inspect`. It automatically extracts and formats metadata, top cognitive/cyclomatic complexity symbols, blast radius risk rankings, class metrics (WMC/CBO/RFC), and architectural hotspots.

```bash
# 1. Inspect default project graph (auto-discovers codereview_graph.json / graph.json)
node tools/ast-inspect.js
# or via npm:
npm run inspect

# 2. Inspect an arbitrary or external graph file
node tools/ast-inspect.js path/to/graph.json
node tools/ast-inspect.js path/to/external_graph.json

# 3. Semantic human concept query
node tools/ast-inspect.js --concept "session authentication token expiration"

# 4. Limit to top N symbols (default is 15)
node tools/ast-inspect.js --top 10

# 5. Filter by specific report section:
node tools/ast-inspect.js --section cognitive    # Top cognitive complexity functions
node tools/ast-inspect.js --section risk         # Top blast radius risk scores & callers
node tools/ast-inspect.js --section classes      # WMC, CBO, RFC, methods, LOC
node tools/ast-inspect.js --section hotspots     # Critical & High risk architectural hotspots
node tools/ast-inspect.js --section metadata     # File, symbol, and edge totals

# 6. Filter by architectural layer
node tools/ast-inspect.js --layer Presentation
node tools/ast-inspect.js --layer "Domain Services"

# 7. Output raw structured JSON for downstream automation
node tools/ast-inspect.js --json

# 8. Analyze and inspect directly from source on the fly
node tools/ast-outline.js tools --inspect --top 10
node tools/ast-outline.js /path/to/project --inspect
```

---

### 7. Gemini Conversation & Agent Skill Adherence Analyzer

Analyzes Gemini conversation transcripts (`transcript.jsonl` / `transcript_full.jsonl`), reconstructing each step of the agent's trajectory:
- **What the agent was doing**: Categorizes actions (git ops, test execution, AST inspection, code editing, file viewing).
- **Tools considered and why**: Extracts model `thinking` reasoning and explains why tools were selected.
- **Linking to available agent skills**: Correlates steps with installed/available skills.
- **Skill adherence auditing**: Detects rule violations (e.g., ad-hoc `node -e`, blind grep) and missed skill opportunities with actionable recommendations.
- **Interactive HTML Dashboard**: Generates self-contained `conversation_report.html` with filters and collapsible reasoning.

```bash
# 1. Analyze active conversation
node tools/conversation-analyzer.js

# 2. Export interactive HTML dashboard
node tools/conversation-analyzer.js --html conversation_report.html

# 3. Deep-dive into specific step (thinking + tool rationale + linked skills)
node tools/conversation-analyzer.js --step 12

# 4. Filter to only missed opportunities and rule violations
node tools/conversation-analyzer.js --missed

# 5. Output structured JSON for automated quality gates
node tools/conversation-analyzer.js --json
```

---

## Artifacts & Outputs Reference

| File | Purpose | Default Output Location |
| :--- | :--- | :--- |
| `codereview_symbol_map.md` | Human-readable Markdown symbol index, blast radius, and Domain Concept Routing Map | Project root |
| `codereview_graph.json` | Complete Graph IR + concepts + intersections for `codereview` | Project root |
| `graph.json` | Graph IR loaded by `index.html` fallback fetch | Project root |
| `data.js` | Graph IR wrapped in `window.INITIAL_GRAPH_DATA` for `index.html` | Project root |
| `index.html` | Interactive D3-based visual exploration workbench | Open with `npm run open` |
| `conversation_report.html` | Interactive self-contained HTML dashboard of conversation and skill adherence | Project root |

---

## Verification & Health Check

After making changes or running analyses, verify system health:

```bash
# 1. Run unit tests
npm test

# 2. Check architecture scorecard
npm run analyze:lint

# 3. Verify node, edge, and concept counts in generated graph
node tools/ast-inspect.js codereview_graph.json --section metadata
```
