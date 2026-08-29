# Roadmap: Codebase Verification & Understanding Workbench

## Overview

Building a standalone, high-performance visual verification and mental model workbench that inspects, analyzes, and interactively validates the Go + Svelte email codebase (`~/projects/mail`). The journey starts with static AST extraction and full-stack bridge parsing, moves through deep Go concurrency and security taint auditing, introduces an interactive scenario simulation engine, and culminates in a rich, interactive visual workbench with multi-lens graph navigation, synchronized code inspection, and Go idiom explainers.

## Phases

- [ ] **Phase 1: Codebase AST & Full-Stack Bridge Extraction Engine** - Extract symbols, call graphs, Go struct definitions, and Wails full-stack bindings.
- [ ] **Phase 2: Deep Concurrency, Mutex & Race Hazard Auditor** - Audit mutex lifecycles, defer safety, concurrent map writes, and generate Go idiom explanations.
- [ ] **Phase 3: Security, Dataflow & Sanitizer Invariant Engine** - Trace untrusted email dataflows, audit regex sanitization bypasses, and check SQL parameterization.
- [ ] **Phase 4: Scenario-Driven Verification & Simulation Engine** - Create step-by-step execution traces, state mutations, and invariant verification harnesses for core workflows.
- [ ] **Phase 5: Interactive Visual Workbench UI** - Deliver a state-of-the-art interactive web workbench with zoomable topology graph, multi-lens filtering, scenario stepper, and synchronized code viewer.

## Phase Details

### Phase 1: Codebase AST & Full-Stack Bridge Extraction Engine
**Goal**: Build the core static analysis engine that reads all Go source files and Svelte/Wails bindings in `~/projects/mail`, extracting complete symbol topologies, struct members, method signatures, goroutine spawn points, and IPC connections.
**Depends on**: Nothing (first phase)
**Requirements**: TOPO-01, TOPO-02, TOPO-03
**Success Criteria**:
  1. Parser reads `~/projects/mail` and produces a structured `topology.json` containing all Go packages, structs, methods, goroutines, and mutex fields.
  2. Wails IPC bindings in `frontend/` are mapped directly to backend `App` methods.
  3. System architecture subsystems (Auth, Sync, Store, Sanitizer, App, Frontend) are accurately classified.
**Plans**: 1 plan

Plans:
- [ ] 01-01: Implement Go AST & Wails Bridge Extractor to generate `topology.json`.

### Phase 2: Deep Concurrency, Mutex & Race Hazard Auditor
**Goal**: Implement static concurrency analysis to detect mutex mismanagement, unprotected map access, lock-order deadlocks, and generate Go memory model explainers.
**Depends on**: Phase 1
**Requirements**: CONC-01, CONC-02, CONC-03
**Success Criteria**:
  1. Detects all mutex lock/unlock call pairs and audits `defer` safety across all methods in `app.go`, `store.go`, `sync.go`.
  2. Flags unprotected concurrent map reads/writes (such as `a.clients` or `a.syncingAccounts`).
  3. Produces clear, educational Go concurrency refresher explainers for each detected pattern.
**Plans**: 1 plan

Plans:
- [ ] 02-01: Implement Go Concurrency Auditor and Idiom Refresher Engine.

### Phase 3: Security, Dataflow & Sanitizer Invariant Engine
**Goal**: Trace untrusted data from Gmail ingestion through `sanitizer.go` to SQLite and Svelte DOM, auditing vulnerabilities in regex-based sanitization.
**Depends on**: Phase 1
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria**:
  1. Maps end-to-end dataflow paths from raw email input to SQLite storage and Svelte `{@html}` rendering.
  2. Identifies security bypass vectors in `sanitizer.go` regex rules (mXSS, nested tags, tracking pixel circumvention).
  3. Verifies SQL parameterization in `store.go`.
**Plans**: 1 plan

Plans:
- [ ] 03-01: Implement Dataflow Taint Tracer & HTML Sanitizer Security Auditor.

### Phase 4: Scenario-Driven Verification & Simulation Engine
**Goal**: Build an execution trace and simulation harness allowing developers to run step-by-step verified scenarios with call stacks, mutex states, and variable diffs.
**Depends on**: Phase 2, Phase 3
**Requirements**: SCEN-01, SCEN-02, SCEN-03
**Success Criteria**:
  1. Generates discrete step-by-step traces for 4 core scenarios (Mailbox Sync, HTML Sanitization, Concurrent Account Switching, DB Transactions).
  2. Each step tracks active AST node, call stack depth, locked mutexes, and state mutations.
  3. Invariant assertions are verified at each scenario step.
**Plans**: 1 plan

Plans:
- [ ] 04-01: Implement Scenario Simulation Engine and Trace Generator.

### Phase 5: Interactive Visual Workbench UI
**Goal**: Deliver a rich, modern, dark-themed interactive web workbench that lets the developer explore the codebase visually, filter by lens, step through scenarios, and inspect source code.
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria**:
  1. User can pan, zoom, and click nodes on the interactive architecture graph to inspect code and details.
  2. User can toggle between Topology, Concurrency, Security, Bridge, and Storage view lenses.
  3. User can play, pause, and step through scenarios with synchronized graph node illumination and state inspector HUD.
  4. Executive mental model summary and invariant scorecard are clearly presented.
**Plans**: 1 plan

Plans:
- [ ] 05-01: Build Interactive Visual Workbench Web Application.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. AST & Bridge Extraction | 1/1 | Complete | 2026-08-30 |
| 2. Concurrency Auditor | 1/1 | Complete | 2026-08-30 |
| 3. Security & Sanitizer Invariant | 1/1 | Complete | 2026-08-30 |
| 4. Scenario Simulation Engine | 1/1 | Complete | 2026-08-30 |
| 5. Interactive Visual Workbench | 1/1 | Complete | 2026-08-30 |
