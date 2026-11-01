# Code Review: AST, Intent Routing & Multi-Hop Blast Radius Navigator

A project-agnostic static code analysis platform, architectural visualizer, and agent skill designed for any JavaScript, TypeScript, and Svelte codebase.

`codereview` replaces blind string grepping with Tree-Sitter AST symbol resolution, multi-hop call graph reachability, Chidamber & Kemerer OO metrics, architectural layer validation, and semantic concept routing.

---

## Features

- **🌐 Project-Agnostic Tree-Sitter AST Analysis**: Parses JavaScript (`.js`, `.mjs`, `.cjs`, `.jsx`), TypeScript (`.ts`, `.mts`, `.cts`, `.tsx`), and Svelte (`.svelte`) to extract functions, classes, methods, constructors, and enums/constants.
- **⚡ Disambiguated Call Graph & Multi-Hop Reachability**: Builds forward and reverse call graphs with caller disambiguation and multi-hop reachability tracing (up to 3 hops) to calculate total affected files and blast radiuses.
- **📊 Objective Complexity & Risk Hotspots**: Computes cyclomatic complexity, cognitive complexity, and Chidamber & Kemerer OO metrics (CBO, WMC, DIT, NOC) to classify symbols into risk tiers (`CRITICAL HOTSPOT`, `HIGH`, `MEDIUM`, `LOW`, `ISOLATED`).
- **🏛️ Architectural Layer Enforcement**: Detects circular dependencies and layer inversions (e.g., lower infrastructure layers illegally invoking higher presentation components).
- **🧠 Human Concept Intent Routing**: Bridges natural language developer queries (e.g. `"session token expiration"`, `"checkout invoice calculation"`) to exact code subsystems and governing symbols using stemmed token matching.
- **🔀 Git Diff & VCS Intersect**: Pinpoints modified symbols directly from `git diff`, showing the blast radius and impacted callers of uncommitted changes.
- **🤖 Agent Conversation & Compliance Auditor**: Analyzes agent interaction transcripts for tool effectiveness, rule violations, and missed opportunities.
- **🖥️ Interactive Visual Workbench**: Explore call graphs, architecture layers, and blast radius maps via the built-in D3.js visualization (`index.html`).

---

## Installation & Setup

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- npm

### Local Installation
```bash
# Clone and install dependencies
git clone <repo-url> codereview
cd codereview
npm install

# (Optional) Link globally so 'codereview' is available in any directory
npm link
```

---

## Quick Start: Analyzing Any Project

You can run `codereview` against **any** target project on your system:

### 1. Zero-Grep Discovery & Intent Routing
```bash
# Query symbols matching a regex pattern or declaration prefix:
codereview query "UserService|AuthSession" /path/to/project

# Search by developer intent or bug description:
codereview concept "authenticate user token expiration" /path/to/project
```

### 2. Pre-Edit Blast Radius Check
Before modifying any function, method, or class, verify its callers and transitive impact:
```bash
codereview blast "AuthService.validateToken" /path/to/project
```

### 3. Pre-Commit Verification & Linting
Verify that your changes introduce no architectural breaches, cycles, or unhandled blast hazards:
```bash
# Check git diff blast radius
codereview diff HEAD /path/to/project

# Verify architectural layering and complexity limits
codereview lint /path/to/project

# Synchronize symbol map and graph IR artifacts
codereview sync /path/to/project
```

### 4. Interactive Visual Workbench
Open the visual navigator to inspect the call graph, subsystem layers, and risk heatmaps:
```bash
# Open in your default browser
open index.html
# or: npm run open
```

---

## Project Configuration (`codereview.config.json`)

`codereview` is project-agnostic by default. To tailor architectural layers, ranks, and domain concepts for a specific project, place a `codereview.config.json` (or `.codereviewrc.json`) in the project root:

```json
{
  "layers": {
    "Presentation": [
      "views",
      "components",
      "pages",
      "cli.js"
    ],
    "Application / Controllers": [
      "controllers",
      "routes",
      "commands"
    ],
    "Domain Services": [
      "services",
      "workflows"
    ],
    "Domain Entities & Metrics": [
      "models",
      "entities",
      "schema"
    ],
    "Infrastructure": [
      "db",
      "storage",
      "cache",
      "config",
      "utils"
    ]
  },
  "layerRanks": {
    "Presentation": 1,
    "Application / Controllers": 2,
    "Domain Services": 3,
    "Domain Entities & Metrics": 4,
    "Infrastructure": 5
  },
  "concepts": [
    {
      "id": "auth_identity",
      "name": "Authentication & Identity",
      "category": "Security / Access",
      "description": "User authentication, JWT verification, and session management.",
      "keywords": [
        "auth", "login", "token", "jwt", "session", "password", "oauth"
      ]
    },
    {
      "id": "order_billing",
      "name": "Orders & Payments",
      "category": "Domain / Commerce",
      "description": "Checkout workflows, invoices, subscriptions, and payment gateways.",
      "keywords": [
        "order", "payment", "invoice", "checkout", "charge", "refund", "stripe"
      ]
    }
  ],
  "ignore": [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".git"
  ]
}
```

If no config file is present, `codereview` automatically applies standard universal architectural layer heuristics and default software engineering concept taxonomies.

---

## CLI Command Reference

| Command | Usage | Description |
| :--- | :--- | :--- |
| `query` | `codereview query "<pattern>" [dir]` | Regex / lexical symbol search across classes, methods, functions, and enums. |
| `concept` | `codereview concept "<intent>" [dir]` | Semantic intent routing to prioritized files and symbols. |
| `blast` | `codereview blast "<symbol>" [dir]` | Multi-hop blast radius impact analysis for a symbol. |
| `diff` | `codereview diff [ref] [dir]` | Calculates blast radius and caller reachability for modified git diff lines. |
| `lint` | `codereview lint [dir]` | Validates architectural layers, checks circular dependencies, and flags monolithic functions. |
| `sync` | `codereview sync [dir]` | Updates `ast_symbol_map.md` and exports unified `ast_graph.json`. |
| `inspect` | `codereview inspect [dir]` | Displays architectural overview, hotspots, and component statistics. |
| `improve` | `codereview improve [dir] [--apply]` | Reviews failed query feedback in `.codereview/feedback.jsonl` and suggests taxonomy keyword improvements. |

---

## Running Tests

```bash
npm test
```
Runs the full test suite verifying Tree-Sitter AST parsing, call resolution, multi-hop reachability, concept builder, transcript analyzer, and project independence.
