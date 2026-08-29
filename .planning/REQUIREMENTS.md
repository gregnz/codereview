# Requirements: Codebase Verification & Understanding Workbench

**Defined:** 2026-08-30
**Core Value:** Empower developers to achieve the same deep, trustworthy mental model and confidence as if they had written the codebase themselves line-by-line, instantly surfacing concurrency hazards, security vulnerabilities, and architectural drift.

## v1 Requirements

### 1. Static Analysis & Topology Extraction (TOPO)
- [ ] **TOPO-01**: Parser scans Go source files (`main.go`, `app.go`, `store.go`, `sync.go`, `sanitizer.go`, `auth.go`) and extracts structs, methods, goroutines, channels, and mutexes.
- [ ] **TOPO-02**: Bridge parser scans Wails TypeScript bindings (`wailsjs/go/...`) and Svelte frontend components to map full-stack call connections.
- [ ] **TOPO-03**: Generates unified graph topology (nodes, edges, subsystems) for interactive visualization.

### 2. Concurrency & Mutex Auditor (CONC)
- [ ] **CONC-01**: Analyzes all `sync.Mutex` and `sync.RWMutex` lock/unlock lifecycles and flags unprotected shared state access (e.g. concurrent map writes).
- [ ] **CONC-02**: Audits `defer` usage for unlock calls and flags early returns or loop-locking pitfalls.
- [ ] **CONC-03**: Provides in-place Go idiom refresher tooltips and cognitive explainers explaining concurrency safety rules.

### 3. Security & Dataflow Invariant Engine (SEC)
- [ ] **SEC-01**: Traces untrusted external email input from ingestion through `sanitizer.go` to SQLite store and Svelte UI sinks.
- [ ] **SEC-02**: Audits regex-based HTML sanitization against known bypass vectors (nested script tags, obfuscated event handlers, tracking pixel bypasses).
- [ ] **SEC-03**: Flags unparameterized SQL queries or direct string concatenations.

### 4. Interactive Scenario Verification Sandbox (SCEN)
- [ ] **SCEN-01**: Provides pre-built interactive execution scenarios (Email Sync & Thread Ingestion, HTML Sanitization & Tracking Strip, Concurrent Account Switching, SQLite Transactions).
- [ ] **SCEN-02**: Interactive stepper controls (Play, Pause, Step Forward/Back, Reset) that highlight active nodes on the topology graph in real time.
- [ ] **SCEN-03**: Live execution state inspector displaying call stack, active mutex locks, goroutine counts, and state mutations per step.

### 5. Interactive Visual Workbench UI (UI)
- [ ] **UI-01**: Responsive, high-fidelity dark-themed graph canvas with pan, zoom, auto-layout, and multi-lens filtering (Topology, Concurrency, Security, Bridge, Storage).
- [ ] **UI-02**: Synchronized split-pane source code viewer with line highlights and hazard badges linked to selected graph nodes.
- [ ] **UI-03**: Executive mental model summary ("How This App Works") and automated invariant scorecard with severity breakdown.

### 7. Architectural Genesis & Code Emergence (GEN)
- [ ] **GEN-01**: Implement structured 6-chapter Genesis narrative modeling the step-by-step creation of the app from zero ("I started at A, then to solve X I added B").
- [ ] **GEN-02**: Implement dynamic node emergence on the graph canvas (nodes appear, connect, and illuminate as the story progresses).
- [ ] **GEN-03**: Create synchronized Code Emergence viewer displaying design decisions, struct evolutions, and authorship rationale.

## v2 Requirements
- **V2-01**: Live runtime dynamic instrumentation via custom Go dlv / eBPF probe agent.
- **V2-02**: Multi-language IDE extension (VS Code / JetBrains plugin).
- **V2-03**: Automated test case generation for newly discovered invariant gaps.

## Out of Scope
| Feature | Reason |
|---------|--------|
| Cloud SaaS hosting | Local developer workbench ensures zero latency, privacy, and instant offline operation |
| Heavy linter / error-centric dashboard as default | Primary focus is pure developer understanding and mental model mastery |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOPO-01 | Phase 1 | Complete |
| TOPO-02 | Phase 1 | Complete |
| TOPO-03 | Phase 1 | Complete |
| CONC-01 | Phase 2 | Complete |
| CONC-02 | Phase 2 | Complete |
| CONC-03 | Phase 2 | Complete |
| SEC-01 | Phase 3 | Complete |
| SEC-02 | Phase 3 | Complete |
| SEC-03 | Phase 3 | Complete |
| SCEN-01 | Phase 4 | Complete |
| SCEN-02 | Phase 4 | Complete |
| SCEN-03 | Phase 4 | Complete |
| UI-01 | Phase 5 | Complete |
| UI-02 | Phase 5 | Complete |
| UI-03 | Phase 5 | Complete |
| UCS-01 | Phase 6 | Complete |
| UCS-02 | Phase 6 | Complete |
| UCS-03 | Phase 6 | Complete |
| GEN-01 | Phase 7 | Complete |
| GEN-02 | Phase 7 | Complete |
| GEN-03 | Phase 7 | Complete |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-30*
*Last updated: 2026-08-30 after initial definition*
