# Architecture Research: Codebase Verification & Understanding Workbench

## System Architecture

The tool is structured as a high-performance, modular analysis and visual verification workbench.

```mermaid
flowchart TB
    subgraph Target Codebase ["Target Codebase (~/projects/mail)"]
        GoSrc["Go Source Files\n(main.go, app.go, store.go, sync.go, sanitizer.go)"]
        SvelteSrc["Svelte Frontend & Wails Bindings\n(App.svelte, components, wailsjs/)"]
        Tests["Go Test Files\n(*_test.go)"]
    end

    subgraph Analyzer Engine ["Static & Cognitive Analysis Engine"]
        ASTParser["Go AST & Symbol Parser\n(AST, Structs, Functions, Defer, Goroutines)"]
        ConcurrencyDetector["Concurrency & Mutex Auditor\n(Mutex lifecycles, race hazards, shared maps)"]
        TaintEngine["Dataflow & Sanitizer Taint Tracer\n(Source-to-sink tracking, HTML sanitization audits)"]
        BridgeMapper["Full-Stack Bridge Mapper\n(Go Wails methods <-> TS/Svelte bindings)"]
        CognitiveExplainer["Cognitive Mental Model Synthesizer\n(Architecture summarizer, Go idiom explainer)"]
    end

    subgraph Verification Engine ["Scenario & Invariant Verification Engine"]
        ScenarioSim["Interactive Scenario Simulator\n(Sync flows, Sanitizer edge cases, Concurrency runs)"]
        InvariantChecker["Invariant Audit Engine\n(Defer safety, SQL injection, Sanitization checks)"]
        TraceEmitter["Execution Trace & Event Streamer\n(Step events, call stack snapshots, state diffs)"]
    end

    subgraph Visual Workbench ["Interactive Visual Workbench UI"]
        TopologyGraph["Interactive Architecture & State Graph\n(Pan/Zoom, Multi-Lens Filters, Node Clusters)"]
        ScenarioStepper["Scenario Playback & Stepper HUD\n(Play, Pause, Step, Stack Trace, State Diffs)"]
        CodeInspector["Synchronized Source Code Inspector\n(Line highlights, Idiom tooltips, Hazard alerts)"]
        AuditDashboard["Invariant Scorecard & Hazard Center\n(Issue breakdown, severity, drill-down links)"]
    end

    GoSrc --> ASTParser
    SvelteSrc --> BridgeMapper
    ASTParser --> ConcurrencyDetector
    ASTParser --> TaintEngine
    ASTParser --> CognitiveExplainer
    
    ConcurrencyDetector --> InvariantChecker
    TaintEngine --> InvariantChecker
    BridgeMapper --> TopologyGraph
    
    InvariantChecker --> AuditDashboard
    ScenarioSim --> TraceEmitter
    TraceEmitter --> ScenarioStepper
    ScenarioStepper <--> TopologyGraph
    TopologyGraph <--> CodeInspector
```

## Data Models

### 1. CodebaseTopology
```typescript
interface CodebaseTopology {
  modules: ModuleNode[];
  functions: FunctionNode[];
  structs: StructNode[];
  edges: DependencyEdge[];
  concurrencyHazards: ConcurrencyHazard[];
  securityFlows: SecurityFlow[];
  bridgeEndpoints: BridgeEndpoint[];
  invariants: InvariantCheck[];
}
```

### 2. ScenarioTrace
```typescript
interface ScenarioStep {
  stepIndex: number;
  description: string;
  activeNodeId: string;
  sourceFile: string;
  sourceLine: number;
  callStack: string[];
  mutexState: { [mutexName: string]: "UNLOCKED" | "LOCKED_EXCLUSIVE" | "LOCKED_SHARED" };
  goroutineCount: number;
  dataMutations: { [key: string]: any };
  hazardsTriggered?: string[];
}
```
