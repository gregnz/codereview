/**
 * Universal Cognitive Schema (IR) TypeScript Definitions
 * Language & Framework Agnostic Codebase Mental Model Standard
 */

export interface UniversalTopology {
  projectName: string;
  targetPath: string;
  runtime: "go" | "dotnet" | "java" | "python" | "node" | "rust" | "polyglot";
  modules: ModuleNode[];
  structs: StructOrClassNode[];
  functions: FunctionOrMethodNode[];
  concurrencyReport: ConcurrencyReport;
  securityReport: SecurityReport;
  bridgeEndpoints: BridgeEndpoint[];
  invariants: InvariantCheck[];
  sourceFiles: Record<string, string>;
  summary: string;
}

export interface ModuleNode {
  id: string;
  name: string;
  type: string; // e.g. "backend_service", "storage", "security", "bridge", "frontend_ui"
  description: string;
  files: string[];
  role: string;
  riskScore: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface StructOrClassNode {
  id: string;
  name: string;
  file: string;
  line: number;
  fields: StructField[];
  hasMutex: boolean;
  mutexType?: string; // e.g. "sync.Mutex", "lock(obj)", "ReentrantLock", "asyncio.Lock"
  methods: string[];
  doc?: string;
}

export interface StructField {
  name: string;
  type: string;
  isMutex: boolean;
  isMap: boolean;
  isChannel: boolean;
  isPointer: boolean;
  doc?: string;
}

export interface FunctionOrMethodNode {
  id: string;
  name: string;
  receiver?: string; // e.g. "*App", "BillingService", "OrderController"
  file: string;
  startLine: number;
  endLine: number;
  signature: string;
  calls: string[];
  doc?: string;
}

export interface ConcurrencyReport {
  totalMutexes: number;
  totalGoroutines: number; // Or active async tasks / threads
  hazards: HazardWarning[];
  idiomExplainers: IdiomExplainer[];
}

export interface HazardWarning {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  file: string;
  line: number;
  description: string;
  remedy: string;
  category: "CONCURRENCY" | "SECURITY" | "DATA_INTEGRITY" | "PERFORMANCE";
}

export interface IdiomExplainer {
  concept: string;
  summary: string;
  whyItMatters: string;
  goRule: string; // Generic language rule / guideline
  codeExample: string;
}

export interface SecurityReport {
  taintFlows: TaintFlow[];
  sanitizerAudits: SanitizerAudit[];
  sqlChecks: SQLCheck[];
}

export interface TaintFlow {
  id: string;
  source: string;
  sanitizer: string;
  sink: string;
  description: string;
  isSanitized: boolean;
  steps: string[];
}

export interface SanitizerAudit {
  methodName: string;
  file: string;
  approach: "REGEX" | "DOM_PARSER" | "HTML_SANITIZER" | "PARAM_SQL";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  bypassRisks: string[];
  recommendation: string;
}

export interface SQLCheck {
  file: string;
  line: number;
  querySnippet: string;
  isParameterized: boolean;
}

export interface BridgeEndpoint {
  goMethod: string; // Backend action name
  goFile: string;
  tsBinding: string; // Client invocation binding
  svelteCallers: string[]; // Frontend calling components
  eventType: "INVOKE" | "EVENT_EMIT" | "REST_API" | "GRAPHQL" | "SIGNALR";
}

export interface InvariantCheck {
  id: string;
  category: "CONCURRENCY" | "SECURITY" | "STORAGE" | "BRIDGE" | "PERFORMANCE";
  invariant: string;
  status: "PASSED" | "FAILED" | "WARNING";
  file: string;
  line: number;
  explanation: string;
}
