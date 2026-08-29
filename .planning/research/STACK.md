# Stack Research: Codebase Verification & Understanding Workbench

**Domain:** Automated Codebase Understanding, Static Analysis, Concurrency Tracing & Interactive Visual Verification for AI-Generated Go/Web Apps.
**Target Codebase:** Go backend + Wails + Svelte/TypeScript frontend (`~/projects/mail`).

## Recommended Stack

### 1. Static Analysis & AST Extraction Engine (Go)
| Component | Technology | Rationale | Confidence |
|---|---|---|---|
| AST & Syntax Parsing | `go/parser`, `go/ast`, `go/token` | Standard library, zero dependency, robust AST traversal for Go code. | HIGH |
| Type & SSA Analysis | `golang.org/x/tools/go/ssa`, `golang.org/x/tools/go/callgraph` | Enables precise call graph construction, pointer analysis, and control-flow graphs (CFG). | HIGH |
| Concurrency Hazard Detection | Custom AST Visitor + CFG Analyzer | Scans for mutex lock/unlock pairs, `defer mu.Unlock()` safety, channel deadlocks, and goroutine leak patterns. | HIGH |
| Dataflow & Taint Tracking | Source-to-Sink Taint Engine | Traces untrusted inputs (e.g. Gmail API response / raw HTML) through sanitizers (`sanitizer.go`) to sinks (SQLite `store.go`, Svelte DOM). | HIGH |
| Frontend AST & Bridge Extraction | Tree-sitter / Regex TypeScript & Svelte AST scanner | Scans Svelte files and Wails binding calls (`wailsjs/go/...`) to map full-stack IPC bridges. | HIGH |

### 2. Visual Workbench UI & Interactive Graph Engine
| Component | Technology | Rationale | Confidence |
|---|---|---|---|
| Architecture & State Graph | `Cytoscape.js` + `dagre` / `cola` layout OR HTML5 Canvas + WebGL | Smooth pan/zoom, interactive node expansion, compound nodes (clustering packages/modules), and animated edge flows. | HIGH |
| UI Framework & Styling | Modern Vanilla JS + CSS Glassmorphism Design System (HSL tokens, CSS variables, dark theme) | Zero-build fast load, embeddable as single self-contained HTML workbench or served locally. | HIGH |
| Code Syntax Highlighting | `Prism.js` / `Highlight.js` with custom line highlights & annotation badges | Lightweight, crisp syntax rendering with synchronized hover linking between graph nodes and source lines. | HIGH |
| Execution Timeline & Simulation | Custom Step Sequencer + State Mutation Inspector | Step-by-step interactive playback of scenarios (play, pause, step forward/backward, inspect variables). | HIGH |

### 3. Verification & Scenario Simulation Engine
| Component | Technology | Rationale | Confidence |
|---|---|---|---|
| Scenario Harness | Built-in scenario runner for Go (`go test -json`, synthetic scenario driver) | Runs real tests or synthetic execution traces and streams events (goroutine spawns, mutex acquisitions, DB queries) to UI. | HIGH |
| Invariant Audit Engine | Rule-based invariant checker | Validates critical invariants (e.g., No un-sanitized HTML in store, all mutexes released before return, all SQL parameterized). | HIGH |

## What NOT to Use and Why
- **Heavy JVM/Cloud Tools (SonarQube, SonarCloud)**: Too slow, lacks interactive visual scenario simulation, opaque rules, no visual full-stack Go<->Svelte bridge mapping.
- **Generic UML Diagram Generators (PlantUML, Graphviz static PNGs)**: Static images do not allow interactive drill-down, live code linking, or scenario step playback.
- **Complex Containerized Runtimes**: Tool should run locally with zero-overhead binary or local web server that reads `~/projects/mail` instantly.
