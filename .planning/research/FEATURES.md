# Features Research: Codebase Verification & Understanding Workbench

## Feature Dimensions

### 1. Interactive Architecture & Concurrency Map (The Macro Lens)
- **Interactive Multi-Level Graph Visualization**: Pan, zoom, cluster, and expand codebase elements from high-level subsystems down to functions and struct fields.
- **Dedicated View Lenses**:
  - **Full-Stack Topology Lens**: Visualizes Go backend services, SQLite store, Wails runtime bridge, and Svelte frontend components.
  - **Concurrency & Mutex Lens**: Highlights all goroutines, `sync.Mutex` / `sync.RWMutex` locks, critical sections, and channel flows.
  - **Security & Dataflow Lens**: Traces untrusted external input (Gmail API / network) through sanitizer boundaries to database and UI sinks.
  - **Database & Storage Lens**: Maps SQLite tables, schema migrations, and SQL queries with transaction boundary highlights.

### 2. Deep Go Concurrency & Idiom Explainer
- **Mutex Lifecycle Visualizer**:
  - Highlights lock acquisition, critical section span, and unlock paths.
  - Flags dangerous patterns: unlock without defer, double locking, mutex copies by value, unprotected shared map access (`clients`, `syncingAccounts`).
- **Cognitive Refresher HUD**:
  - In-place explainers for Go synchronization idioms: RWMutex read vs write locks, goroutine scheduling, channel directionality, context cancellation propagation.

### 3. Security & Sanitization Invariant Checker
- **Source-to-Sink Taint Visualizer**:
  - Visual path from raw email payload -> `SanitizeEmailHTML` -> SQLite `InsertMessage` -> Svelte `{@html cleanHTML}`.
- **Regex vs Parser HTML Sanitization Audit**:
  - Real-time vulnerability analyzer demonstrating edge cases in regex-based HTML stripping (nested tags, attribute obfuscation, mXSS).
- **Tracker Blocker Inspector**:
  - Visual simulation of tracker detection rules against real email tracking pixel URLs.

### 4. Full-Stack Wails IPC Bridge Inspector
- **Go <-> Svelte Binding Map**:
  - Automatically matches exposed Go methods in `App` (`Bind: []interface{}{app}`) to their TypeScript wrappers in `wailsjs/go/main/App.js` and Svelte caller components.
- **Event Bus Visualization**:
  - Maps `wailsRuntime.EventsEmit` in Go to `EventsOn` listeners in Svelte stores.

### 5. Scenario-Driven Verification Sandbox
- **Interactive Scenario Simulation & Stepper**:
  - Step through end-to-end execution flows with Play / Pause / Step controls:
    - *Scenario A: Background Sync & Thread Ingestion*
    - *Scenario B: Malicious HTML Sanitization & Tracker Stripping*
    - *Scenario C: Concurrent Account Switching & Lock Contention*
    - *Scenario D: SQLite Database Crash / Rollback Recovery*
  - Watch active nodes light up on the architecture graph as execution progresses.
  - Live inspection pane showing call stack, mutex states, and variable mutations at each step.

### 6. Automated Codebase Health & Invariant Audit
- **Executive Cognitive Summary**: "How This App Works" high-level narrative generated from the AST and architecture topology.
- **Automated Invariant Scorecard**:
  - Mutex lock safety (100% defer adherence)
  - Data sanitization verification (all untrusted inputs sanitized before storage/render)
  - Context cancellation (all background loops respect `ctx.Done()`)
  - Error wrapping & propagation (no ignored errors on critical I/O)
