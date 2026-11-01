# Tree-Sitter AST Symbol Map & Multi-Hop Blast Radius Index

*Generated automatically by `tools/ast-outline.js` using Tree-Sitter GLR parsers.*
*Includes disambiguated caller resolution, multi-hop reachability, and architectural complexity hotspot ratings.*

## Domain Concept & Intent Routing Index

*High-level semantic map bridging human developer terminology to underlying subsystems and code symbols.*

| Human Concept Domain | Subsystem Category | Governing Files | Key Enums & Canonical Symbols |
| :--- | :--- | :--- | :--- |
| **AST & Syntax Analysis** | Parsing / Grammar | `tools/src/parser/decision-harvester.js`, `tools/src/parser/javascript.js`, `tools/src/parser/ast-helpers.js` | `NODE_DECISION_HANDLERS`, `CLI_OPTIONS`, `harvestNodeDetails`, `parseFunctionDeclaration`, `parseClassDeclaration` |
| **Call Graph & Reachability** | Graph / Resolution | `tools/src/graph/concept-builder.js`, `tools/src/graph/graph-builder.js`, `tools/src/graph/cycles.js` | `CLI_OPTIONS`, `NODE_DECISION_HANDLERS`, `resolveCalleeTargets`, `findConceptIntersections`, `resolveEffectiveTaxonomies` |
| **Complexity & Blast Metrics** | Metrics / Risk | `tools/src/metrics/blast-scoring.js`, `tools/src/graph/concept-builder.js`, `tools/src/metrics/class-metrics.js` | `CLI_OPTIONS`, `calculateCoupling`, `computeSymbolBlastSummary`, `calculateComplexityMultiplier` |
| **Intent & Concept Routing** | Semantic / Routing | `tools/src/graph/concept-builder.js`, `tools/src/telemetry/feedback-logger.js`, `tools/src/commands/concept.js` | `CLI_OPTIONS`, `CLI_OPTIONS`, `stemWord`, `tokenizeIdentifier`, `tokenizeText` |
| **Conversation & Skill Audit** | Audit / Compliance | `tools/src/conversation/conversation-analyzer.js`, `tools/src/conversation/transcript-parser.js`, `tools/src/commands/conversation.js` | `CLI_OPTIONS`, `COLORS`, `evaluateFallbackSkillRules`, `evaluateSkillAdherence`, `recordSkillAdherence` |

> ⚡ **Key Cross-Concept Intersections (Common Bug Hotspots):**
> - `/Users/gregday/projects/codereview/tools/ast-inspect.js#main` (tools/ast-inspect.js:L76) ──[calls]──► `/Users/gregday/projects/codereview/tools/conversation-analyzer.js#printHelp` (tools/conversation-analyzer.js:L25)
>   *(AST & Syntax Analysis ──► Conversation & Skill Audit)*
> - `/Users/gregday/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L78) ──[calls]──► `/Users/gregday/projects/codereview/tools/conversation-analyzer.js#printHelp` (tools/conversation-analyzer.js:L25)
>   *(AST & Syntax Analysis ──► Conversation & Skill Audit)*
> - `/Users/gregday/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L97) ──[calls]──► `/Users/gregday/projects/codereview/tools/src/graph/graph-builder.js#buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L259)
>   *(AST & Syntax Analysis ──► Call Graph & Reachability)*
> - `/Users/gregday/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L97) ──[calls]──► `/Users/gregday/projects/codereview/tools/src/graph/graph-builder.js#buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L259)
>   *(AST & Syntax Analysis ──► Complexity & Blast Metrics)*
> - `/Users/gregday/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L111) ──[calls]──► `/Users/gregday/projects/codereview/tools/src/commands/export.js#runExportCommand` (tools/src/commands/export.js:L8)
>   *(AST & Syntax Analysis ──► Call Graph & Reachability)*

## Subsystem Layer: Presentation

### `tools/ast-inspect.js` (104 lines)

**State Enums & Data Tables:**
- `CLI_OPTIONS` [L17-L25]: `top, section, layer, query, concept, json, help`

**Functions:**
- `printHelp()` [L27-L66]
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 4 files, 4 transitive)**
- `main()` [L68-L95]

### `tools/ast-outline.js` (262 lines)

**Functions:**
- `resolveTargetDirectory(target = '.')` [L53-L72] — *============================================================================*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L82)
- `main()` [L74-L241] 📏 [MONOLITHIC]

### `tools/cli.js` (476 lines)

**Functions:**
- `printHelp()` [L31-L71]
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 4 files, 4 transitive)**
- `resolveTarget(dirArg = '.')` [L73-L79]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (12 direct callers across 1 files, 12 transitive)**
- `buildGraphIndex(targetDir, rootDir)` [L81-L95]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (7 direct callers across 1 files, 13 transitive)**
- `getOrBuildGraph(targetDir, rootDir)` [L97-L107]
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `handleConceptCommand` (tools/cli.js:L115), `handleQueryCommand` (tools/cli.js:L138)
- `handleConceptCommand(query, dirArg, asJson)` [L109-L130]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L422)
- `handleQueryCommand(regexQuery, dirArg, asJson)` [L132-L152]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L424)
- `handleBlastCommand(symbolName, dirArg)` [L154-L162]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L426)
- `handleReviewCommand(targetArg, dirArg, asJson)` [L164-L189]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L418)
- `handleDecisionsCommand(targetArg, dirArg, asJson)` [L191-L207]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L420)
- `handleDiffCommand(diffRef, dirArg, asJson)` [L209-L276]
  - 💥 *Blast Radius [2 direct, 2 transitive callers]*: `handleVerifyCommand` (tools/cli.js:L369), `main` (tools/cli.js:L428)
- `handleLintCommand(dirArg)` [L278-L282]
  - 💥 *Blast Radius [2 direct, 2 transitive callers]*: `handleVerifyCommand` (tools/cli.js:L366), `main` (tools/cli.js:L430)
- `handleSyncCommand(dirArg)` [L284-L298]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 1 files, 4 transitive)**
- `handleClassifyCommand(filePath, layerName, dirArg)` [L300-L354]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L436)
- `handleVerifyCommand(dirArg, asJson)` [L356-L372]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L434)
- `handleInitCommand(dirArg)` [L374-L401]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L438)
- `main()` [L403-L464]

### `tools/conversation-analyzer.js` (105 lines)

**State Enums & Data Tables:**
- `CLI_OPTIONS` [L14-L23]: `conversation, step, missed, summary, tokens, json, html, help`

**Functions:**
- `printHelp()` [L25-L66]
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 4 files, 4 transitive)**
- `main()` [L68-L96]

### `tools/src/cli/args.js` (95 lines)

**State Enums & Data Tables:**
- `CLI_OPTIONS` [L3-L20]: `json, 'write-map', 'export-graph', 'graph-json', query, 'blast-radius', mermaid, diff, ... (16 total)`

**Functions:**
- `parseCliArgs(rawArgs = process.argv.slice(2))` [L22-L63]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L75)
- `printHelp()` [L65-L89]
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 4 files, 4 transitive)**

## Subsystem Layer: Infrastructure

### `tools/src/cache/graph-cache.js` (76 lines)

**Functions:**
- `resolveGraphPaths(targetDir, rootDir)` [L8-L24] — ** Discovers candidate graph files or returns the default cache path.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L98)
- `isCacheFresh(graphFilePath, targetDir)` [L29-L47] — ** Verifies if an existing graph cache is fresh compared to source file mtimes.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L99)
- `loadCachedGraph(graphFilePath)` [L52-L56] — ** Loads and parses cached Graph IR JSON.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L100)
- `saveCachedGraph(graphData, cacheFilePath)` [L61-L68] — ** Persists Graph IR JSON to disk.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L105)

### `tools/src/config/layers.js` (263 lines)

**State Enums & Data Tables:**
- `DEFAULT_LAYERS` [L38-L45]: `'Presentation', 'Simulation', 'AI & Guidance', 'Entities & Physics', 'Story & Narrative', 'Infrastructure'`
- `LAYER_RANKS` [L47-L59]: `'Presentation', 'Presentation / Exporters', 'Application / Controllers', 'Simulation', 'Story & Narrative', 'AI & Guidance', 'Domain Services', 'Domain Logic', ... (11 total)`

**Functions:**
- `findProjectRoot(startPath = process.cwd())` [L87-L110] — ** Walks upward from a starting file or directory to discover the enclosing project root.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (6 direct callers across 4 files, 20 transitive)**
- `loadProjectConfig(rootDir = process.cwd())` [L119-L147] — ** Searches for and loads optional project-specific architectural configuration.*
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `main` (tools/ast-outline.js:L85), `buildGraphIndex` (tools/cli.js:L82)
- `getProjectConfig()` [L152-L154] — ** Returns the currently loaded project configuration, if any.*
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `resolveEffectiveTaxonomies` (tools/src/graph/concept-builder.js:L488), `collectFiles` (tools/src/parser/javascript.js:L504)
- `getEffectiveLayerRanks(customConfig = cachedProjectConfig)` [L159-L164] — ** Returns merged layer ranks combining built-in ranks and optional custom config overrides.*
- `getLayerDetails(filePath, customConfig = cachedProjectConfig)` [L173-L208] — ** Resolves detailed classification information for a file path.*
  - 💥 *Blast Radius [3 direct, 26 transitive callers]*: `runLintCommand` (tools/src/commands/lint.js:L54), `runLintCommand` (tools/src/commands/lint.js:L55), `getLayerForFile` (tools/src/config/layers.js:L224)
- `getLayerForFile(filePath, customConfig = cachedProjectConfig)` [L223-L225] — ** Maps a file path to its architectural subsystem layer.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (10 direct callers across 8 files, 33 transitive)**
- `getEffectiveSubsystems(customConfig = cachedProjectConfig)` [L239-L244] — ** Returns effective architectural subsystems list from project config or standard architectural defaults.*
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `exportGraphIR` (tools/src/exporters/graph-ir.js:L79)

### `tools/src/metrics/cognitive.js` (106 lines)

**Functions:**
- `getCognitiveComplexity(bodyNode, currentNesting = 0)` [L6-L101] — ** Computes SonarSource Cognitive Complexity for a function body AST node.*
  - 💥 *Blast Radius [3 direct, 8 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L205), `parseClassDeclaration` (tools/src/parser/javascript.js:L271), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L322)

### `tools/src/metrics/cyclomatic.js` (45 lines)

**Functions:**
- `getCyclomaticComplexity(bodyNode)` [L5-L40] — ** Computes McCabe Cyclomatic Complexity v(G) for a function body AST node.*
  - 💥 *Blast Radius [3 direct, 8 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L204), `parseClassDeclaration` (tools/src/parser/javascript.js:L270), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L321)

### `tools/src/parser/ast-helpers.js` (78 lines)

**Functions:**
- `getLeadingComment(node, sourceLines)` [L1-L23]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (5 direct callers across 1 files, 9 transitive)**
- `getMaxBlockDepth(node, currentDepth = 0)` [L25-L40]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 2 files, 8 transitive)**
- `getParamCount(node)` [L42-L52]
  - 💥 *Blast Radius [3 direct, 8 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L202), `parseClassDeclaration` (tools/src/parser/javascript.js:L268), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L319)
- `getReturnCount(bodyNode)` [L54-L70]
  - 💥 *Blast Radius [3 direct, 8 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L203), `parseClassDeclaration` (tools/src/parser/javascript.js:L269), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L320)

### `tools/src/parser/decision-harvester.js` (514 lines)

**State Enums & Data Tables:**
- `NODE_DECISION_HANDLERS` [L267-L299]: `binary_expression, try_statement, new_expression, assignment_expression, augmented_assignment_expression, member_expression, call_expression`

**Functions:**
- `extractObjectPatternKeys(objPatternNode)` [L17-L29]
  - 💥 *Blast Radius [2 direct, 1 transitive callers]*: `classifySingleParamNode` (tools/src/parser/decision-harvester.js:L36), `classifySingleParamNode` (tools/src/parser/decision-harvester.js:L50)
- `classifySingleParamNode(child)` [L31-L54]
- `extractParamContracts(node)` [L59-L66] — ** Extracts structured parameter contracts (defaults, destructured option keys, rest params).*
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `harvestFunctionDecisions` (tools/src/parser/decision-harvester.js:L335)
- `extractObjectLiteralKeys(exprNode)` [L68-L79]
  - 💥 *Blast Radius [2 direct, 4 transitive callers]*: `classifyReturnExpression` (tools/src/parser/decision-harvester.js:L108), `inspectModuleExportsStatement` (tools/src/parser/decision-harvester.js:L468)
- `classifyCallReturnShape(exprNode)` [L81-L95]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `classifyReturnExpression` (tools/src/parser/decision-harvester.js:L114)
- `classifyReturnExpression(exprNode)` [L100-L117] — ** Infers the return contract shape of a return_statement value expression.*
- `extractLeadingGuards(bodyNode)` [L122-L140] — ** Extracts leading guard clauses at the start of a function block.*
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `harvestFunctionDecisions` (tools/src/parser/decision-harvester.js:L336)
- `recordBinaryThreshold(curr, ctx)` [L142-L154]
- `recordTryCatchPolicy(curr, ctx)` [L156-L165]
- `recordAssignmentMutation(curr, ctx)` [L167-L180]
- `recordMemberReadDecision(curr, ctx)` [L182-L194]
- `classifySideEffectCall(fnText, ctx)` [L200-L226]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `recordCallDecision` (tools/src/parser/decision-harvester.js:L238)
- `recordCallDecision(curr, ctx)` [L228-L257]
- `recordNewExpressionDecision(curr, ctx)` [L259-L265]
- `inspectDecisionNode(curr, ctx)` [L301-L304]
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `harvestFunctionDecisions` (tools/src/parser/decision-harvester.js:L380)
- `resolveControlArchetype(ctx, guards)` [L306-L315]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `classifyArchetypeAndScaling` (tools/src/parser/decision-harvester.js:L326)
- `resolveScalingProfile(ctx)` [L317-L322]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `classifyArchetypeAndScaling` (tools/src/parser/decision-harvester.js:L327)
- `classifyArchetypeAndScaling(ctx, guards)` [L324-L329]
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `harvestFunctionDecisions` (tools/src/parser/decision-harvester.js:L389)
- `harvestFunctionDecisions(node, bodyNode, symbolName, enclosingClass = null)` [L334-L428] — ** Harvests all 4 Decision Lenses for a function or method body.*
  - 💥 *Blast Radius [3 direct, 8 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L206), `parseClassDeclaration` (tools/src/parser/javascript.js:L272), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L323)
- `inspectTopLevelDeclarator(decl, isMutableBinding, fileCtx)` [L430-L458]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `harvestFileDecisions` (tools/src/parser/decision-harvester.js:L491)
- `inspectModuleExportsStatement(child, exportedSymbols)` [L460-L472]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `harvestFileDecisions` (tools/src/parser/decision-harvester.js:L495)
- `harvestFileDecisions(rootNode)` [L478-L505] — ** Harvests file-level structural decisions: module imports (external vs internal),*
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L453)

### `tools/src/parser/javascript.js` (535 lines)

**Functions:**
- `handleCallExpression(node, callerSymbolId, enclosingClass, state)` [L29-L114] — ** Handles member and identifier call expressions, resolving receiver and bus signals.*
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `harvestNodeDetails` (tools/src/parser/javascript.js:L173)
- `handleNewExpression(node, callerSymbolId, state)` [L119-L133] — ** Handles class instantiation (new expression).*
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `harvestNodeDetails` (tools/src/parser/javascript.js:L175)
- `handleEnumMemberExpression(node, callerSymbolId, state)` [L138-L163] — ** Handles enum or constant dictionary member reads.*
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `harvestNodeDetails` (tools/src/parser/javascript.js:L177)
- `harvestNodeDetails(bodyNode, callerSymbolId, enclosingClass, state)` [L168-L186] — ** Traverses a block body to collect outbound calls, instantiations, signals, and enum reads.*
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L429)
- `parseFunctionDeclaration(node, filePath, sourceLines, harvestDetails)` [L191-L229] — ** Parses a function declaration node.*
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L433)
- `parseClassDeclaration(node, filePath, sourceLines, harvestDetails)` [L234-L302] — ** Parses a class declaration node and its methods.*
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L438)
- `parseArrowOrFunctionExpression(node, varName, valueNode, filePath, sourceLines, harvestDetails)` [L310-L345] — ** Parses an arrow function or function expression assigned to a variable.*
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `parseVariableDeclaration` (tools/src/parser/javascript.js:L384)
- `parseObjectEnum(node, varName, valueNode, filePath, sourceLines)` [L350-L369] — ** Parses a constant object definition as a state enum or data table.*
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `parseVariableDeclaration` (tools/src/parser/javascript.js:L387)
- `parseVariableDeclaration(node, filePath, sourceLines, harvestDetails, symbols)` [L374-L391] — ** Parses variable declarations containing arrow functions, function expressions, or state enums.*
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L443)
- `extractScriptFromSvelte(sourceCode)` [L393-L402]
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L409)
- `parseFileAST(filePath, sourceCode)` [L408-L478] — ** Parses JavaScript/TypeScript source code using Tree-Sitter to extract structured symbols,*
  - 💥 *Blast Radius [3 direct, 16 transitive callers]*: `main` (tools/ast-outline.js:L92), `buildGraphIndex` (tools/cli.js:L88), `computeGitDecisionDiff` (tools/src/vcs/decision-diff.js:L464)
- `isIgnoredEntry(entryName, customIgnore)` [L486-L491]
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `collectFiles` (tools/src/parser/javascript.js:L515)
- `collectFiles(targetPath)` [L496-L525] — ** Recursively collects JavaScript source files from target directory.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (4 direct callers across 4 files, 16 transitive)**

### `tools/src/telemetry/feedback-logger.js` (212 lines)

**Functions:**
- `getFeedbackFilePath(rootDir = process.cwd())` [L10-L12] — ** Resolves the path to the feedback log file.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `readFeedbackEvents` (tools/src/telemetry/feedback-logger.js:L42)
- `logTelemetryEvent(rootDir, event)` [L17-L36] — ** Appends a telemetry or feedback event to the feedback log in a non-blocking, fault-tolerant manner.*
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 3 files, 7 transitive)**
- `readFeedbackEvents(rootDir = process.cwd())` [L41-L62] — ** Reads and parses all recorded feedback events from the project root.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `summarizeFeedback` (tools/src/telemetry/feedback-logger.js:L81)
- `extractCandidateKeywords(query)` [L67-L75] — ** Tokenizes natural language query strings into stemmed/cleaned candidate taxonomy keywords.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `summarizeFeedback` (tools/src/telemetry/feedback-logger.js:L100)
- `summarizeFeedback(rootDir = process.cwd())` [L80-L145] — ** Analyzes recorded feedback events to extract patterns, missing taxonomy terms, and failure clusters.*
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `runImproveCommand` (tools/src/commands/improve.js:L91), `applyTaxonomyImprovements` (tools/src/telemetry/feedback-logger.js:L151)
- `applyTaxonomyImprovements(rootDir = process.cwd())` [L150-L203] — ** Applies suggestions derived from feedback directly to codereview.config.json.*
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runImproveCommand` (tools/src/commands/improve.js:L94)

### `tools/src/vcs/decision-diff.js` (615 lines)

**Functions:**
- `arrayDiff(beforeArr = [], afterArr = [])` [L19-L25]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (15 direct callers across 1 files, 11 transitive)**
- `formatParamContract(p)` [L27-L37]
- `normalizeThresholdExpr(expr)` [L39-L43]
- `diffContractAndDataLens(bDec, tDec, changes)` [L45-L106]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `diffSymbolDecisions` (tools/src/vcs/decision-diff.js:L272)
- `diffBehaviorAndHeuristicsLens(bDec, tDec, changes)` [L108-L176]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `diffSymbolDecisions` (tools/src/vcs/decision-diff.js:L273)
- `diffOperationsAndTrustLens(bDec, tDec, changes)` [L178-L221]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `diffSymbolDecisions` (tools/src/vcs/decision-diff.js:L274)
- `diffSymbolDecisions(baseSym, targetSym)` [L226-L277] — ** Compares two symbol records (baseSym vs targetSym) and returns a list of high-level decision changes.*
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `diffFileASTDecisions` (tools/src/vcs/decision-diff.js:L378), `diffGraphSnapshots` (tools/src/vcs/decision-diff.js:L555)
- `diffFileASTDecisions(relFile, baseParsed, targetParsed)` [L282-L427] — ** Compares two parsed file AST results (before vs after) and returns file-level and symbol-level decision diffs.*
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `computeGitDecisionDiff` (tools/src/vcs/decision-diff.js:L466)
- `getGitFileContent(gitRef, relFile, rootDir)` [L432-L443] — ** Loads a file's source code at a given git reference (e.g. 'HEAD'), returning null if the file is new.*
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `computeGitDecisionDiff` (tools/src/vcs/decision-diff.js:L463)
- `computeGitDecisionDiff(gitRef = 'HEAD', allFileResults = [], blastIndex = null, rootDir = process.cwd(), diffMap = new Map())` [L448-L499] — ** Computes a complete repository Decision Diff against a git reference for all modified files.*
  - 💥 *Blast Radius [2 direct, 4 transitive callers]*: `handleReviewCommand` (tools/cli.js:L180), `handleDiffCommand` (tools/cli.js:L262)
- `diffGraphSnapshots(baseGraph, targetGraph, label = 'Baseline Snapshot')` [L505-L607] — ** Compares two full Graph IR objects (e.g. a saved baseline ast_graph.json vs current Graph IR)*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `handleDiffCommand` (tools/cli.js:L229)

### `tools/src/vcs/git-diff.js` (96 lines)

**Functions:**
- `isGitRepo(cwd = process.cwd())` [L3-L13]
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `getChangedLinesFromDiff` (tools/src/vcs/git-diff.js:L16)
- `getChangedLinesFromDiff(gitRef = 'HEAD', cwd = process.cwd())` [L15-L72]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **MEDIUM (4 direct callers across 2 files, 5 transitive)**
- `intersectDiffWithSymbols(diffMap, index)` [L74-L90]
  - 💥 *Blast Radius [3 direct, 4 transitive callers]*: `main` (tools/ast-outline.js:L103), `main` (tools/ast-outline.js:L133), `handleDiffCommand` (tools/cli.js:L245)

## Subsystem Layer: Application / Controllers

### `tools/src/commands/blast.js` (64 lines)

**Functions:**
- `runBlastCommand(blastTarget, blastIndex)` [L8-L59] — ** Executes a targeted blast radius and risk query for a given symbol identifier.*
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `main` (tools/ast-outline.js:L178), `handleBlastCommand` (tools/cli.js:L161)

### `tools/src/commands/concept.js` (97 lines)

**Functions:**
- `formatConceptOutput(result)` [L6-L71] — ** Formats concept resolution diagnostics for CLI stdout.*
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `runConceptCommand` (tools/src/commands/concept.js:L88), `runInspectCommand` (tools/src/commands/inspect.js:L283)
- `runConceptCommand(conceptQuery, blastIndex, options = {})` [L76-L91] — ** Executes the concept query command, supporting human-readable output and JSON.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L186)

### `tools/src/commands/conversation.js` (226 lines)

**State Enums & Data Tables:**
- `COLORS` [L7-L20]: `reset, bold, dim, cyan, blue, green, yellow, red, ... (12 total)`
  - 💥 *Blast Radius: CRITICAL (60 direct callers across 2 files, 13 transitive)*

**Functions:**
- `formatScoreBadge(score)` [L22-L26]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `printCliHeader` (tools/src/commands/conversation.js:L45)
- `formatAuditBadge(status)` [L28-L33]
  - 💥 *Blast Radius [3 direct, 5 transitive callers]*: `printStepDeepDive` (tools/src/commands/conversation.js:L77), `printStepDeepDive` (tools/src/commands/conversation.js:L101), `printTimeline` (tools/src/commands/conversation.js:L128)
- `printCliHeader(analysis)` [L35-L55]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L195)
- `printTokenRanking(analysis)` [L57-L71]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L198)
- `printStepDeepDive(item)` [L73-L109]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L208)
- `printTimeline(analysis, options)` [L111-L149]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L212)
- `printRemediationGuide(analysis)` [L151-L175]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L213)
- `runConversationCommand(targetPath, options = {})` [L177-L219]
  - 💥 *Blast Radius [2 direct, 2 transitive callers]*: `main` (tools/cli.js:L440), `main` (tools/conversation-analyzer.js:L83)

### `tools/src/commands/decisions.js` (425 lines)

**Functions:**
- `formatParamBrief(p)` [L17-L25]
- `buildSymbolDecisionCard(symbolId, blastIndex)` [L30-L90] — ** Builds a structured Decision Card object for a symbol in the blastIndex.*
  - 💥 *Blast Radius [3 direct, 5 transitive callers]*: `summarizeCodebaseDecisions` (tools/src/commands/decisions.js:L184), `runDecisionsCommand` (tools/src/commands/decisions.js:L389), `runDecisionsCommand` (tools/src/commands/decisions.js:L398)
- `formatSymbolDecisionCard(card)` [L95-L165] — ** Formats a single Symbol Decision Card for readable terminal output.*
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `runDecisionsCommand` (tools/src/commands/decisions.js:L393), `runDecisionsCommand` (tools/src/commands/decisions.js:L402)
- `summarizeCodebaseDecisions(allFileResults, blastIndex, rootDir, filterTarget = null)` [L170-L233] — ** Formats a high-level codebase or file Decision Summary when no single symbol is targeted.*
  - 💥 *Blast Radius [2 direct, 4 transitive callers]*: `handleReviewCommand` (tools/cli.js:L178), `runDecisionsCommand` (tools/src/commands/decisions.js:L408)
- `formatCodebaseDecisionSummary(summary)` [L235-L283]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runDecisionsCommand` (tools/src/commands/decisions.js:L412)
- `formatDecisionDiffReport(decisionDiff, changedReport = [])` [L288-L380] — ** Formats a Git Decision Diff report into a concise Reviewer Decision Scorecard.*
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `handleDiffCommand` (tools/cli.js:L239), `handleDiffCommand` (tools/cli.js:L273)
- `runDecisionsCommand(targetQuery, allFileResults, blastIndex, rootDir, options = {})` [L385-L415] — ** CLI runner for `codereview decisions [targetSymbolOrFile]`*
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `handleDecisionsCommand` (tools/cli.js:L206)

### `tools/src/commands/export.js` (28 lines)

**Functions:**
- `runExportCommand(exportGraph, allFileResults, blastIndex, rootDir, changedSymbolIds)` [L8-L23] — ** Exports complete Graph IR to JSON and synchronizes data.js for D3 visualization.*
  - 💥 *Blast Radius [3 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L111), `main` (tools/ast-outline.js:L126), `main` (tools/ast-outline.js:L190)

### `tools/src/commands/improve.js` (118 lines)

**State Enums & Data Tables:**
- `COLORS` [L9-L18]: `reset, bold, dim, green, yellow, cyan, red, magenta`
  - 💥 *Blast Radius: CRITICAL (60 direct callers across 2 files, 13 transitive)*

**Functions:**
- `runFeedbackCommand(message, options = {}, targetDir = '.')` [L23-L48] — ** Handles explicit feedback logging from agents or developers.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L444)
- `printImprovementReport(summary, rootDir)` [L53-L84] — ** Formats and prints feedback summary report to the console.*
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runImproveCommand` (tools/src/commands/improve.js:L110)
- `runImproveCommand(targetDir = '.', options = {})` [L89-L112] — ** Analyzes telemetry and generates recommendations or applies auto-improvements.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L447)

### `tools/src/commands/inspect.js` (308 lines)

**Functions:**
- `getNodeMetrics(node)` [L8-L33] — ** Extracts normalized metrics from a graph node, handling both flat and nested schemas.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **MEDIUM (5 direct callers across 1 files, 6 transitive)**
- `getClassMetrics(node)` [L38-L50] — ** Extracts normalized class metrics from a class node.*
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `generateInspectionData` (tools/src/commands/inspect.js:L110)
- `generateInspectionData(graphData, options = {})` [L55-L135] — ** Generates an inspection report object from graph data.*
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `runInspectCommand` (tools/src/commands/inspect.js:L288)
- `formatInspectionOutput(reportData, options = {})` [L140-L216] — ** Formats inspection data as a clean, human-readable terminal output.*
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `runInspectCommand` (tools/src/commands/inspect.js:L295)
- `resolveGraphData(targetPath = null)` [L221-L252] — ** Resolves graph file path or returns graph data.*
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `runInspectCommand` (tools/src/commands/inspect.js:L263)
- `runInspectCommand(graphInput, options = {})` [L257-L298] — ** CLI command runner for inspect.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (4 direct callers across 3 files, 5 transitive)**

### `tools/src/commands/lint.js` (99 lines)

**Functions:**
- `runLintCommand(allFileResults, blastIndex, rootDir)` [L7-L94] — ** Runs the static code complexity and architectural hotspot linter.*
  - 💥 *Blast Radius [3 direct, 4 transitive callers]*: `main` (tools/ast-outline.js:L129), `main` (tools/ast-outline.js:L161), `handleLintCommand` (tools/cli.js:L281)

### `tools/src/commands/map.js` (26 lines)

**Functions:**
- `runMapCommand(writeMap, allFileResults, blastIndex, rootDir)` [L8-L21] — ** Generates Markdown AST symbol map and either writes it to disk or prints to stdout.*
  - 💥 *Blast Radius [3 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L110), `main` (tools/ast-outline.js:L125), `main` (tools/ast-outline.js:L240)

### `tools/src/commands/mermaid.js` (15 lines)

**Functions:**
- `runMermaidCommand(mermaidTarget, blastIndex)` [L6-L10] — ** Generates and prints a Mermaid dependency flowchart for a given symbol.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L174)

### `tools/src/commands/query.js` (104 lines)

**Functions:**
- `sanitizeQuery(rawQuery)` [L10-L24] — ** Sanitizes search queries and extracts declaration keywords.*
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `generateInspectionData` (tools/src/commands/inspect.js:L67), `runQueryCommand` (tools/src/commands/query.js:L35)
- `runQueryCommand(rawQuery, blastIndex, options = {})` [L34-L98] — ** Searches the symbol catalog for items matching a query string.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L182)

### `tools/src/commands/review.js` (284 lines)

**Functions:**
- `checkSymbolFindings(card)` [L11-L119]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `generateCoachingReview` (tools/src/commands/review.js:L182)
- `generateCoachingReview(summary, blastIndex, decisionDiff = null)` [L124-L197] — ** Generates a structured Coaching & Mentoring Review from a codebase decision summary and blastIndex.*
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `handleReviewCommand` (tools/cli.js:L181)
- `formatSingleDiffQuestion(sym, d)` [L199-L216]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `collectDiffQuestions` (tools/src/commands/review.js:L224)
- `collectDiffQuestions(decisionDiff)` [L218-L229]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `generateCoachingReview` (tools/src/commands/review.js:L195)
- `formatCoachingReview(review)` [L231-L277]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `handleReviewCommand` (tools/cli.js:L186)

## Subsystem Layer: Domain Services

### `tools/src/conversation/conversation-analyzer.js` (494 lines)

**Functions:**
- `categorizeActivity(step)` [L6-L82] — ** Categorizes the primary activity of a planner step.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `processPlannerStep` (tools/src/conversation/conversation-analyzer.js:L351)
- `analyzeToolConsideration(step)` [L87-L116] — ** Extracts tool consideration and rationale from thinking and tool calls.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `processPlannerStep` (tools/src/conversation/conversation-analyzer.js:L352)
- `matchTrigger(text, trigger)` [L121-L126] — ** Matches trigger as a distinct word or token rather than arbitrary substring.*
  - 💥 *Blast Radius [3 direct, 3 transitive callers]*: `evaluateSkillAdherence` (tools/src/conversation/conversation-analyzer.js:L203), `evaluateSkillAdherence` (tools/src/conversation/conversation-analyzer.js:L206), `evaluateSkillAdherence` (tools/src/conversation/conversation-analyzer.js:L215)
- `evaluateFallbackSkillRules(skill, step, currentContext, flags)` [L131-L180] — ** Evaluates fallback adherence rules when a prescribed tool was not directly invoked in this step.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `evaluateSkillAdherence` (tools/src/conversation/conversation-analyzer.js:L254)
- `evaluateSkillAdherence(step, currentContext, skills)` [L181-L293]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `processPlannerStep` (tools/src/conversation/conversation-analyzer.js:L356)
- `recordToolUsage(step, context, trackers)` [L298-L312] — ** Records tool calls, updates context flags, and tallies tool frequencies.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `processPlannerStep` (tools/src/conversation/conversation-analyzer.js:L354)
- `recordSkillAdherence(step, consideration, skillEval, trackers)` [L317-L344] — ** Evaluates skill adherence for a planner step and accumulates violations and missed opportunities.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `processPlannerStep` (tools/src/conversation/conversation-analyzer.js:L357)
- `processPlannerStep(step, context, skills, trackers)` [L349-L378] — ** Processes a single PLANNER_RESPONSE step, updating trackers and returning timeline item.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `analyzeConversation` (tools/src/conversation/conversation-analyzer.js:L444)
- `analyzeConversation(transcriptData, options = {})` [L383-L486] — ** Main conversation analysis function.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L179)

### `tools/src/conversation/skills-registry.js` (321 lines)

**Functions:**
- `parseSkillMarkdown(content, filePath)` [L197-L250] — ** Parses frontmatter and key sections from a markdown file (SKILL.md).*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `loadSkillFromDir` (tools/src/conversation/skills-registry.js:L261)
- `loadSkillFromDir(workspaceSkillsDir, entryName, skillsMap)` [L255-L283] — ** Loads and merges a single skill definition from its directory.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `discoverSkills` (tools/src/conversation/skills-registry.js:L306)
- `discoverSkills(options = {})` [L288-L314] — ** Discovers skills from workspace and system paths.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `analyzeConversation` (tools/src/conversation/conversation-analyzer.js:L384)

### `tools/src/conversation/transcript-parser.js` (435 lines)

**Functions:**
- `resolveFromDirectory(dir)` [L8-L14] — ** Resolves candidate transcript paths within a directory.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `resolveTranscriptPath` (tools/src/conversation/transcript-parser.js:L60)
- `findLatestBrainConversation()` [L19-L47] — ** Discovers the most recently modified conversation transcript in the user's brain directory.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `resolveTranscriptPath` (tools/src/conversation/transcript-parser.js:L81)
- `resolveTranscriptPath(targetPath, options = {})` [L52-L94] — ** Resolves the transcript and full transcript file paths based on inputs.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `parseTranscript` (tools/src/conversation/transcript-parser.js:L331)
- `parseToolArgs(rawArgs)` [L99-L122] — ** Safely parses JSON argument values (handles stringified JSON).*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `parseTranscript` (tools/src/conversation/transcript-parser.js:L373)
- `parseMarkdownToolCall(headerRaw, bodyRaw)` [L127-L235] — ** Parses a Markdown-formatted conversation transcript (e.g. exported "## User" / "## Assistant" logs).*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `parseMarkdownTranscript` (tools/src/conversation/transcript-parser.js:L290)
- `parseMarkdownTranscript(rawText, mainPath)` [L237-L325]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `parseTranscript` (tools/src/conversation/transcript-parser.js:L339)
- `parseTranscript(targetPath, options = {})` [L330-L428] — ** Parses transcript lines into normalized step objects.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L178)

### `tools/src/graph/call-resolver.js` (56 lines)

**Functions:**
- `resolveCalleeTargets(call, catalog, nameToIds)` [L3-L51]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `connectGraphEdges` (tools/src/graph/graph-builder.js:L115)

### `tools/src/graph/concept-builder.js` (659 lines)

**Functions:**
- `stemWord(word)` [L7-L27] — ** Normalizes and stems common English and code word forms.*
  - 💥 *Blast Radius [3 direct, 12 transitive callers]*: `tokenizeIdentifier` (tools/src/graph/concept-builder.js:L46), `tokenizeText` (tools/src/graph/concept-builder.js:L73), `initializeConceptCatalog` (tools/src/graph/concept-builder.js:L317)
- `tokenizeIdentifier(str)` [L32-L51] — ** Splits camelCase, PascalCase, snake_case, and CONSTANT_CASE identifiers into individual stemmed tokens.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (7 direct callers across 1 files, 6 transitive)**
- `tokenizeText(text)` [L62-L77] — ** Tokenizes arbitrary natural language text or comments into normalized words.*
  - 💥 *Blast Radius [2 direct, 12 transitive callers]*: `collectSymbolTokens` (tools/src/graph/concept-builder.js:L347), `queryConcepts` (tools/src/graph/concept-builder.js:L576)
- `initializeConceptCatalog(taxonomies)` [L311-L334] — ** Initializes the concept catalog with stemmed keywords.*
  - 💥 *Blast Radius [1 direct, 8 transitive callers]*: `buildConceptMap` (tools/src/graph/concept-builder.js:L501)
- `collectSymbolTokens(sym)` [L339-L355] — ** Extracts and tokenizes all identifier words from a symbol.*
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `mapSymbolsToConcepts` (tools/src/graph/concept-builder.js:L409), `scoreSymbolQueryMatch` (tools/src/graph/concept-builder.js:L524)
- `scoreSymbolAgainstConcepts(sym, tokens, conceptCatalog)` [L360-L400] — ** Scores a symbol against all concepts in the catalog.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `mapSymbolsToConcepts` (tools/src/graph/concept-builder.js:L410)
- `mapSymbolsToConcepts(blastIndex, conceptCatalog)` [L405-L426] — ** Maps all symbols in the catalog to their matching concepts.*
  - 💥 *Blast Radius [1 direct, 8 transitive callers]*: `buildConceptMap` (tools/src/graph/concept-builder.js:L502)
- `findConceptIntersections(edges, catalog, symbolToConcepts, conceptCatalog)` [L431-L482] — ** Detects cross-concept intersections across graph call edges.*
  - 💥 *Blast Radius [1 direct, 8 transitive callers]*: `buildConceptMap` (tools/src/graph/concept-builder.js:L503)
- `resolveEffectiveTaxonomies(customTaxonomies = [])` [L487-L494] — ** Resolves the effective taxonomy list from defaults, project config, and caller overrides.*
  - 💥 *Blast Radius [1 direct, 8 transitive callers]*: `buildConceptMap` (tools/src/graph/concept-builder.js:L500)
- `buildConceptMap(blastIndex, customTaxonomies = [])` [L499-L515] — ** Builds the Concept Map and cross-concept call intersections from the symbol catalog and call graph.*
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `runInspectCommand` (tools/src/commands/inspect.js:L275), `buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L281)
- `scoreSymbolQueryMatch(sym, queryTokens)` [L520-L543] — ** Scores a single symbol against query tokens.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `findDirectSymbolMatches` (tools/src/graph/concept-builder.js:L553)
- `findDirectSymbolMatches(queryTokens, blastIndex)` [L548-L570] — ** Scores symbols in the catalog directly against query tokens (lexical & stemmed identifier match).*
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `queryConcepts` (tools/src/graph/concept-builder.js:L614)
- `queryConcepts(queryString, conceptMap, blastIndex)` [L575-L649] — ** Answers a natural-language human query by resolving concepts, likely subsystems, and code locations.*
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `runConceptCommand` (tools/src/commands/concept.js:L81), `runInspectCommand` (tools/src/commands/inspect.js:L276)

### `tools/src/graph/cycles.js` (98 lines)

**Functions:**
- `tagParentClassCycle(sym, cycleIdx, scc, catalog)` [L6-L15] — ** Propagates cycle membership to parent class symbol if applicable.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `tagCycleSymbols` (tools/src/graph/cycles.js:L28)
- `tagCycleSymbols(scc, cycleIdx, catalog)` [L20-L30] — ** Tags symbols participating in a multi-node circular dependency cycle.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `detectCycles` (tools/src/graph/cycles.js:L69)
- `tagCycleEdges(edges, nodeCycleMap)` [L35-L43] — ** Tags edges that bridge between nodes in the same cycle.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `detectCycles` (tools/src/graph/cycles.js:L83)
- `detectCycles(graph, catalog, edges)` [L55-L90] — ** Detects circular dependencies (cycles) using strongly connected components (SCC).*
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L275)

### `tools/src/graph/graph-builder.js` (342 lines)

**Functions:**
- `populateSymbolCatalog(allFileResults, rootDir, graph)` [L12-L62] — ** Builds the symbol catalog, name indexes, and initializes graphology nodes.*
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L263)
- `connectGraphEdges(allFileResults, catalog, nameToIds, graph)` [L67-L166] — ** Connects direct calls, class instantiations, event signals, enums, and inheritance edges.*
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L266)
- `createMultiHopReachability(catalog, inboundDirect)` [L171-L254] — ** Creates multi-hop blast reachability, root entry-point identification, and pathing helpers.*
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L269)
- `buildBlastRadiusIndex(allFileResults, rootDir)` [L259-L301] — ** Builds the comprehensive Blast Radius & Multi-Hop Call Graph index.*
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `main` (tools/ast-outline.js:L97), `buildGraphIndex` (tools/cli.js:L92)
- `resolveSymbolIds(target, blastIndex)` [L306-L333] — ** Resolves a symbol query (bare name, Class.method, Class#method, file#symbol, or full ID) to matching catalog IDs.*
  - 💥 *Blast Radius [3 direct, 8 transitive callers]*: `runBlastCommand` (tools/src/commands/blast.js:L9), `runDecisionsCommand` (tools/src/commands/decisions.js:L387), `generateMermaidDiagram` (tools/src/exporters/mermaid.js:L6)

### `tools/src/graph/layer-validator.js` (76 lines)

**Functions:**
- `evaluateEdgeViolation(e, sSym, tSym, customRanks = getEffectiveLayerRanks())` [L6-L33] — ** Checks if a single edge represents an architectural layer inversion.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `checkLayerViolations` (tools/src/graph/layer-validator.js:L51)
- `checkLayerViolations(edges, catalog, customRanks = getEffectiveLayerRanks())` [L45-L70] — ** Validates architectural layering between source and target symbols across edges.*
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L278)

## Subsystem Layer: Presentation / Exporters

### `tools/src/conversation/html-reporter.js` (615 lines)

**Functions:**
- `buildClientScript(dataJson)` [L587-L589] — ** Builds the embedded client script tag.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `generateHtmlReport` (tools/src/conversation/html-reporter.js:L607)
- `generateHtmlReport(analysisResult)` [L594-L610] — ** Generates a self-contained, interactive HTML dashboard for Gemini conversation analysis.*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runConversationCommand` (tools/src/commands/conversation.js:L190)

### `tools/src/exporters/graph-ir.js` (98 lines)

**Functions:**
- `exportGraphIR(allFileResults, blastIndex, rootDir, changedSymbolIds = new Set())` [L4-L93]
  - 💥 *Blast Radius [3 direct, 16 transitive callers]*: `main` (tools/ast-outline.js:L165), `buildGraphIndex` (tools/cli.js:L93), `runExportCommand` (tools/src/commands/export.js:L9)

### `tools/src/exporters/markdown-map.js` (159 lines)

**Functions:**
- `formatBlastLine(br)` [L5-L12]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `formatMethodMarkdown` (tools/src/exporters/markdown-map.js:L35)
- `formatEnumsMarkdown(enums, blastIndex)` [L14-L26]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `formatFileMarkdown` (tools/src/exporters/markdown-map.js:L84)
- `formatMethodMarkdown(m, blastIndex)` [L28-L37]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `formatClassesMarkdown` (tools/src/exporters/markdown-map.js:L54)
- `formatClassesMarkdown(classes, blastIndex)` [L39-L59]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `formatFileMarkdown` (tools/src/exporters/markdown-map.js:L85)
- `formatFunctionsMarkdown(functions, blastIndex)` [L61-L79]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `formatFileMarkdown` (tools/src/exporters/markdown-map.js:L86)
- `formatFileMarkdown(r, rootDir, blastIndex)` [L81-L88]
  - 💥 *Blast Radius [1 direct, 8 transitive callers]*: `formatSymbolsMarkdown` (tools/src/exporters/markdown-map.js:L145)
- `formatConceptMapMarkdown(conceptMap)` [L90-L123]
  - 💥 *Blast Radius [1 direct, 8 transitive callers]*: `formatSymbolsMarkdown` (tools/src/exporters/markdown-map.js:L131)
- `formatSymbolsMarkdown(allFileResults, blastIndex, rootDir)` [L125-L150]
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `handleSyncCommand` (tools/cli.js:L290), `runMapCommand` (tools/src/commands/map.js:L9)

### `tools/src/exporters/mermaid.js` (52 lines)

**Functions:**
- `generateMermaidDiagram(symbolName, blastIndex)` [L4-L47]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runMermaidCommand` (tools/src/commands/mermaid.js:L7)

## Subsystem Layer: Domain Entities & Metrics

### `tools/src/metrics/blast-scoring.js` (279 lines)

**Functions:**
- `calculateCoupling(symbolId, index)` [L4-L51] — ** Computes direct and multi-hop coupling metrics for a symbol.*
  - 💥 *Blast Radius [1 direct, 21 transitive callers]*: `computeSymbolBlastSummary` (tools/src/metrics/blast-scoring.js:L208)
- `determineImpactTier(hop1Count, uniqueFilesCount, totalTransitive)` [L56-L67] — ** Determines impact tier label based on direct caller count and file reach.*
  - 💥 *Blast Radius [1 direct, 21 transitive callers]*: `computeSymbolBlastSummary` (tools/src/metrics/blast-scoring.js:L209)
- `calculateComplexityMultiplier(sym)` [L72-L108] — ** Computes control-flow and object-oriented complexity scaling multiplier.*
  - 💥 *Blast Radius [1 direct, 21 transitive callers]*: `computeSymbolBlastSummary` (tools/src/metrics/blast-scoring.js:L215)
- `calculateArchitecturalPenalties(sym)` [L113-L125] — ** Calculates architectural rule violation penalty points.*
  - 💥 *Blast Radius [1 direct, 21 transitive callers]*: `computeSymbolBlastSummary` (tools/src/metrics/blast-scoring.js:L216)
- `extractSymbolRiskFeatures(riskScore, sym, metrics)` [L130-L150] — ** Extracts and normalizes symbol risk features into a flat evaluation record.*
  - 💥 *Blast Radius [1 direct, 13 transitive callers]*: `determineRiskCategory` (tools/src/metrics/blast-scoring.js:L193)
- `determineRiskCategory(riskScore, sym, metrics)` [L192-L200] — ** Evaluates calibrated multi-tier risk rating for a symbol.*
  - 💥 *Blast Radius [1 direct, 21 transitive callers]*: `computeSymbolBlastSummary` (tools/src/metrics/blast-scoring.js:L219)
- `computeSymbolBlastSummary(symbolId, index)` [L206-L269] — ** Computes multi-factor complexity blast radius impact, composite risk score,*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (12 direct callers across 8 files, 26 transitive)**

### `tools/src/metrics/class-metrics.js` (141 lines)

**Functions:**
- `computeInheritanceTrees(classList, extendsMap)` [L4-L29] — ** Calculates DIT (Depth of Inheritance Tree) and NOC (Number of Children) for all classes.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `computeClassMetrics` (tools/src/metrics/class-metrics.js:L99)
- `collectForeignClasses(memberIds, outboundDirect, catalog, currentClassName)` [L34-L53] — ** Finds all distinct external classes coupled to a class or any of its methods (CBO).*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `computeClassMetrics` (tools/src/metrics/class-metrics.js:L107)
- `getMethodsForClass(sym, catalog)` [L58-L61] — ** Resolves all method symbols belonging to a class.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `computeClassMetrics` (tools/src/metrics/class-metrics.js:L96)
- `calculateWmc(methods)` [L66-L78] — ** Sums cyclomatic, cognitive, and LOC totals for a class method list (WMC).*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `computeClassMetrics` (tools/src/metrics/class-metrics.js:L104)
- `computeClassMetrics(catalog, outboundDirect)` [L87-L132] — ** Computes Chidamber & Kemerer Object-Oriented Metrics for all classes in the catalog:*
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L272)

