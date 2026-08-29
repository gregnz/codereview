# Codebase Verification & Understanding Sandbox

## What This Is

An interactive, visual verification and understanding workbench designed to help developers deeply inspect, comprehend, and audit complex AI-generated codebases (starting with a Go + Svelte email client in `~/projects/mail`). It replaces tedious manual PR reviews with an interactive architecture and concurrency map, scenario-driven behavioral verification, safety invariant auditing, and cognitive explanations of Go idioms, synchronization, and state lifecycles.

## Core Value

Empower developers to achieve the same deep, trustworthy mental model and confidence as if they had written the codebase themselves line-by-line, instantly surfacing concurrency hazards, security vulnerabilities, and architectural drift.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **AST & Architecture Extraction Engine**: Static analysis parser for Go and Svelte/TypeScript that extracts components, call graphs, struct definitions, Wails IPC bridges, and state stores.
- [ ] **Concurrency & Synchronization Visualizer**: Visual mapping of goroutines, mutex lock/unlock lifecycles, defer safety, channels, and race condition/deadlock hazard detection with refresher tooltips for Go idioms.
- [ ] **Data Flow & Security Pipeline Inspector**: End-to-end tracking of untrusted inputs (e.g. raw email payload -> HTML sanitizer -> classifier -> SQLite store -> frontend UI rendering) with automated sanitization & injection invariant checking.
- [ ] **Scenario-Driven Verification Sandbox**: Interactive execution harness allowing developers to trigger simulated scenarios (e.g., sync mailbox, sanitize malicious HTML, concurrent read/write) and visually watch the execution path, call tree, and data mutations in real time.
- [ ] **Full-Stack Go <-> Svelte Bridge Inspector**: Visualizing Wails runtime events, backend Go method bindings, frontend Svelte stores, and reactive lifecycle updates.
- [ ] **Interactive Visual Workbench UI**: A rich, dynamic, state-of-the-art interactive web workbench featuring responsive zoomable graph canvas, split-pane source code context, and real-time hazard alerts.

### Out of Scope

- Cloud SaaS hosting / multi-tenant backend (v1 is a zero-friction local developer workbench).
- Arbitrary non-Go/JS language runtime support in v1 (v1 focuses on Go + Svelte/TypeScript as demonstrated by `~/projects/mail`).
- Automated code rewriting without human oversight (focus is on deep visual comprehension, verification, and guided safety).

## Context

- Target initial codebase: `~/projects/mail` (a Wails v2 desktop email client with Go backend, SQLite storage, DOMPurify/sanitizer, IMAP/sync engines, and Svelte frontend).
- Problem: AI code generation produces hundreds of lines across full-stack boundaries faster than a developer can mentally model, leading to anxiety around hidden race conditions, missed error handling, un-sanitized data paths, or mutex misuse.
- Goal: Create a tool that gives back total architectural mastery and verified confidence.

## Constraints

- **Execution Environment**: Runs locally on macOS / modern browsers with zero external telemetry or cloud dependencies.
- **Performance**: Near-instant static graph generation and responsive Canvas/SVG visualization even for multi-thousand line codebases.
- **Aesthetics**: Premium modern workbench UI with dark mode, interactive graph navigation, glassmorphic HUD overlays, and crisp syntax highlighting.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Interactive Architecture & Concurrency Graph as primary view | Provides immediate macro-understanding before drilling into code | — Pending |
| Multi-lens inspection (Concurrency, Security, Bridge, Storage) | Addresses all critical AI-generation blindspots identified by user | — Pending |
| Go AST + Static Call Graph + Scenario Simulation | Enables rigorous safety verification without requiring external heavy test infrastructure | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-30 after initialization*
