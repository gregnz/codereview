# Codebase Mental Model & Visual Verification Workbench

An interactive visual verification and understanding workbench designed to help developers deeply inspect, comprehend, and audit complex AI-generated codebases (such as the Go + Wails + Svelte email client in `~/projects/mail`).

## Features

- **🌐 Interactive Full-Stack Topology Graph**: Pan, zoom, and explore Go backend services, goroutines, SQLite store, and Svelte frontend components with dependency call flows.
- **⚡ Concurrency & Mutex Auditor**: Static AST analysis identifying `sync.Mutex` and `sync.RWMutex` lock lifecycles, missing `defer` unlocks, loop locking, and fatal concurrent Go map read/write hazards.
- **🛡️ Security & Dataflow Invariant Engine**: End-to-end taint tracking from raw Gmail API payloads to SQLite persistence, plus regex-based HTML sanitization bypass audits (mXSS & tracking pixel evasion).
- **🎬 Interactive Scenario Verification Sandbox**: Step-by-step playback of core application workflows (Mailbox Sync, Malicious Email Strip, Concurrent Multi-Account Switching) with live call stacks, active mutex states, and variable mutation diffs.
- **📖 Go Concurrency & Memory Model Explainer**: Built-in refresher HUD cards explaining Go synchronization idioms, RWMutex rules, defer ordering, and context cancellation.
- **Synchronized Source Code Viewer**: Click any node on the graph or hazard card to jump straight to the source line with real-time hazard alerts.

## Quick Start

### 1. Launch the Workbench
```bash
./codereview
```
This scans `~/projects/mail`, compiles the latest AST topology, and automatically opens the interactive workbench in your default browser at `http://localhost:8088`.

### 2. Standalone HTML File
You can also directly open `workbench.html` in any modern web browser with zero server dependencies:
```bash
open workbench.html
```

### 3. Scan a Custom Codebase
```bash
./codereview /path/to/any/go/project
```
