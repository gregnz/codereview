# Tree-Sitter AST Symbol Map & Multi-Hop Blast Radius Index

*Generated automatically by `tools/ast-outline.js` using Tree-Sitter GLR parsers.*
*Includes disambiguated caller resolution, multi-hop reachability, and architectural complexity hotspot ratings.*

## Domain Concept & Intent Routing Index

*High-level semantic map bridging human developer terminology to underlying subsystems and code symbols.*

| Human Concept Domain | Subsystem Category | Governing Files | Key Enums & Canonical Symbols |
| :--- | :--- | :--- | :--- |
| **AST & Syntax Analysis** | Parsing / Grammar | `tools/src/parser/JavaAstExtractor.java`, `tools/src/parser/decision-harvester.js`, `tools/src/parser/javascript.js` | `NODE_DECISION_HANDLERS`, `CLI_OPTIONS`, `harvestNodeDetails`, `parseFunctionDeclaration`, `parseClassDeclaration` |
| **Call Graph & Reachability** | Graph / Resolution | `tools/src/graph/concept-builder.js`, `tools/src/graph/graph-builder.js`, `tools/src/graph/journey.js` | `CLI_OPTIONS`, `NODE_DECISION_HANDLERS`, `resolveCalleeTargets`, `findConceptIntersections`, `resolveEffectiveTaxonomies` |
| **Complexity & Blast Metrics** | Metrics / Risk | `tools/src/metrics/blast-scoring.js`, `tools/src/graph/concept-builder.js`, `tools/src/metrics/class-metrics.js` | `CLI_OPTIONS`, `calculateCoupling`, `computeSymbolBlastSummary`, `calculateComplexityMultiplier` |
| **Intent & Concept Routing** | Semantic / Routing | `tools/src/graph/concept-builder.js`, `tools/src/telemetry/feedback-logger.js`, `tools/src/commands/concept.js` | `CLI_OPTIONS`, `CLI_OPTIONS`, `stemWord`, `tokenizeIdentifier`, `tokenizeText` |
| **Conversation & Skill Audit** | Audit / Compliance | `tools/src/conversation/conversation-analyzer.js`, `tools/src/conversation/transcript-parser.js`, `tools/src/commands/conversation.js` | `CLI_OPTIONS`, `COLORS`, `evaluateFallbackSkillRules`, `evaluateSkillAdherence`, `recordSkillAdherence` |

> ⚡ **Key Cross-Concept Intersections (Common Bug Hotspots):**
> - `/Users/greg_day/projects/codereview/tools/ast-inspect.js#main` (tools/ast-inspect.js:L76) ──[calls]──► `/Users/greg_day/projects/codereview/tools/conversation-analyzer.js#printHelp` (tools/conversation-analyzer.js:L25)
>   *(AST & Syntax Analysis ──► Conversation & Skill Audit)*
> - `/Users/greg_day/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L79) ──[calls]──► `/Users/greg_day/projects/codereview/tools/conversation-analyzer.js#printHelp` (tools/conversation-analyzer.js:L25)
>   *(AST & Syntax Analysis ──► Conversation & Skill Audit)*
> - `/Users/greg_day/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L92) ──[calls]──► `/Users/greg_day/projects/codereview/tools/src/graph/graph-builder.js#buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L259)
>   *(AST & Syntax Analysis ──► Call Graph & Reachability)*
> - `/Users/greg_day/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L92) ──[calls]──► `/Users/greg_day/projects/codereview/tools/src/graph/graph-builder.js#buildBlastRadiusIndex` (tools/src/graph/graph-builder.js:L259)
>   *(AST & Syntax Analysis ──► Complexity & Blast Metrics)*
> - `/Users/greg_day/projects/codereview/tools/ast-outline.js#main` (tools/ast-outline.js:L106) ──[calls]──► `/Users/greg_day/projects/codereview/tools/src/commands/export.js#runExportCommand` (tools/src/commands/export.js:L8)
>   *(AST & Syntax Analysis ──► Call Graph & Reachability)*

## Subsystem Layer: Presentation

### `tools/ast-inspect.js` (104 lines)

**State Enums & Data Tables:**
- `CLI_OPTIONS` [L17-L25]: `top, section, layer, query, concept, json, help`

**Functions:**
- `printHelp()` [L27-L66]
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 4 files, 4 transitive)**
- `main()` [L68-L95]

### `tools/ast-outline.js` (257 lines)

**Functions:**
- `resolveTargetDirectory(target = '.')` [L54-L73] — *============================================================================*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L83)
- `main()` [L75-L236] 📏 [MONOLITHIC]

### `tools/cli.js` (475 lines)

**Functions:**
- `printHelp()` [L33-L74]
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 4 files, 4 transitive)**
- `resolveTarget(dirArg = '.')` [L76-L82]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (12 direct callers across 1 files, 12 transitive)**
- `buildGraphIndex(targetDir, rootDir)` [L84-L92]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (7 direct callers across 1 files, 13 transitive)**
- `getOrBuildGraph(targetDir, rootDir)` [L94-L104]
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `handleConceptCommand` (tools/cli.js:L112), `handleQueryCommand` (tools/cli.js:L135)
- `handleConceptCommand(query, dirArg, asJson)` [L106-L127]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L421)
- `handleQueryCommand(regexQuery, dirArg, asJson)` [L129-L149]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L423)
- `handleBlastCommand(symbolName, dirArg)` [L151-L159]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L425)
- `handleReviewCommand(targetArg, dirArg, asJson)` [L161-L186]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L417)
- `handleDecisionsCommand(targetArg, dirArg, asJson)` [L188-L204]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L419)
- `handleDiffCommand(diffRef, dirArg, asJson)` [L206-L273]
  - 💥 *Blast Radius [2 direct, 2 transitive callers]*: `handleVerifyCommand` (tools/cli.js:L366), `main` (tools/cli.js:L427)
- `handleLintCommand(dirArg)` [L275-L279]
  - 💥 *Blast Radius [2 direct, 2 transitive callers]*: `handleVerifyCommand` (tools/cli.js:L363), `main` (tools/cli.js:L429)
- `handleSyncCommand(dirArg)` [L281-L295]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 1 files, 4 transitive)**
- `handleClassifyCommand(filePath, layerName, dirArg)` [L297-L351]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L435)
- `handleVerifyCommand(dirArg, asJson)` [L353-L369]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L433)
- `handleInitCommand(dirArg)` [L371-L398]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L437)
- `main()` [L400-L463]

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
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L76)
- `printHelp()` [L65-L89]
  - 💥 *Blast Radius [Risk: HIGH]*: **CRITICAL (5 direct callers across 4 files, 4 transitive)**

## Subsystem Layer: Infrastructure

### `tools/src/cache/graph-cache.js` (76 lines)

**Functions:**
- `resolveGraphPaths(targetDir, rootDir)` [L8-L24] — ** Discovers candidate graph files or returns the default cache path.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L95)
- `isCacheFresh(graphFilePath, targetDir)` [L29-L47] — ** Verifies if an existing graph cache is fresh compared to source file mtimes.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L96)
- `loadCachedGraph(graphFilePath)` [L52-L56] — ** Loads and parses cached Graph IR JSON.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L97)
- `saveCachedGraph(graphData, cacheFilePath)` [L61-L68] — ** Persists Graph IR JSON to disk.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `getOrBuildGraph` (tools/cli.js:L102)

### `tools/src/config/layers.js` (263 lines)

**State Enums & Data Tables:**
- `DEFAULT_LAYERS` [L38-L45]: `'Presentation', 'Simulation', 'AI & Guidance', 'Entities & Physics', 'Story & Narrative', 'Infrastructure'`
- `LAYER_RANKS` [L47-L59]: `'Presentation', 'Presentation / Exporters', 'Application / Controllers', 'Simulation', 'Story & Narrative', 'AI & Guidance', 'Domain Services', 'Domain Logic', ... (11 total)`

**Functions:**
- `findProjectRoot(startPath = process.cwd())` [L87-L110] — ** Walks upward from a starting file or directory to discover the enclosing project root.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (6 direct callers across 4 files, 20 transitive)**
- `loadProjectConfig(rootDir = process.cwd())` [L119-L147] — ** Searches for and loads optional project-specific architectural configuration.*
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `main` (tools/ast-outline.js:L86), `buildGraphIndex` (tools/cli.js:L85)
- `getProjectConfig()` [L152-L154] — ** Returns the currently loaded project configuration, if any.*
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `resolveEffectiveTaxonomies` (tools/src/graph/concept-builder.js:L488), `collectFiles` (tools/src/parser/javascript.js:L510)
- `getEffectiveLayerRanks(customConfig = cachedProjectConfig)` [L159-L164] — ** Returns merged layer ranks combining built-in ranks and optional custom config overrides.*
- `getLayerDetails(filePath, customConfig = cachedProjectConfig)` [L173-L208] — ** Resolves detailed classification information for a file path.*
  - 💥 *Blast Radius [3 direct, 26 transitive callers]*: `runLintCommand` (tools/src/commands/lint.js:L54), `runLintCommand` (tools/src/commands/lint.js:L55), `getLayerForFile` (tools/src/config/layers.js:L224)
- `getLayerForFile(filePath, customConfig = cachedProjectConfig)` [L223-L225] — ** Maps a file path to its architectural subsystem layer.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (10 direct callers across 8 files, 33 transitive)**
- `getEffectiveSubsystems(customConfig = cachedProjectConfig)` [L239-L244] — ** Returns effective architectural subsystems list from project config or standard architectural defaults.*
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `exportGraphIR` (tools/src/exporters/graph-ir.js:L85)

### `tools/src/metrics/cognitive.js` (106 lines)

**Functions:**
- `getCognitiveComplexity(bodyNode, currentNesting = 0)` [L6-L101] — ** Computes SonarSource Cognitive Complexity for a function body AST node.*
  - 💥 *Blast Radius [3 direct, 7 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L206), `parseClassDeclaration` (tools/src/parser/javascript.js:L272), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L323)

### `tools/src/metrics/cyclomatic.js` (45 lines)

**Functions:**
- `getCyclomaticComplexity(bodyNode)` [L5-L40] — ** Computes McCabe Cyclomatic Complexity v(G) for a function body AST node.*
  - 💥 *Blast Radius [3 direct, 7 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L205), `parseClassDeclaration` (tools/src/parser/javascript.js:L271), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L322)

### `tools/src/parser/JavaAstExtractor.java` (193 lines)

**Classes:**
- **`JavaAstExtractor`** [L39-L193]
  - `main[public, static] void main(String[] args)` [L40-L159] 📏 [MONOLITHIC]
  - `line[private, static] int line(CompilationUnitTree unit, long position)` [L161-L163]
    - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (7 direct callers across 1 files, 1 transitive)**
  - `decode[private, static] String decode(String value)` [L165-L167]
    - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (6 direct callers across 2 files, 7 transitive)**
  - `encode[private, static] String encode(String value)` [L169-L171]
    - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (9 direct callers across 1 files, 1 transitive)**
  - `emit[private, static] void emit(String[] fields)` [L173-L175]
    - 💥 *Blast Radius [3 direct, 1 transitive callers]*: `main` (tools/src/parser/JavaAstExtractor.java:L84), `main` (tools/src/parser/JavaAstExtractor.java:L94), `main` (tools/src/parser/JavaAstExtractor.java:L149)
- **`MethodMetrics`** extends `TreeScanner<Void, Void>` [L177-L192]
  - 💥 *Class Blast Radius: LOW (1 caller in 1 file)*
  - `visitIf[public] Void visitIf(IfTree node, Void unused)` [L181-L181]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitIf` (tools/src/parser/JavaAstExtractor.java:L181)
  - `visitForLoop[public] Void visitForLoop(ForLoopTree node, Void unused)` [L182-L182]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitForLoop` (tools/src/parser/JavaAstExtractor.java:L182)
  - `visitEnhancedForLoop[public] Void visitEnhancedForLoop(EnhancedForLoopTree node, Void unused)` [L183-L183]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitEnhancedForLoop` (tools/src/parser/JavaAstExtractor.java:L183)
  - `visitWhileLoop[public] Void visitWhileLoop(WhileLoopTree node, Void unused)` [L184-L184]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitWhileLoop` (tools/src/parser/JavaAstExtractor.java:L184)
  - `visitDoWhileLoop[public] Void visitDoWhileLoop(DoWhileLoopTree node, Void unused)` [L185-L185]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitDoWhileLoop` (tools/src/parser/JavaAstExtractor.java:L185)
  - `visitConditionalExpression[public] Void visitConditionalExpression(ConditionalExpressionTree node, Void unused)` [L186-L186]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitConditionalExpression` (tools/src/parser/JavaAstExtractor.java:L186)
  - `visitBinary[public] Void visitBinary(BinaryTree node, Void unused)` [L187-L190]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitBinary` (tools/src/parser/JavaAstExtractor.java:L189)
  - `visitReturn[public] Void visitReturn(ReturnTree node, Void unused)` [L191-L191]
    - 💥 *Blast Radius [1 direct, 0 transitive callers]*: `visitReturn` (tools/src/parser/JavaAstExtractor.java:L191)

### `tools/src/parser/angular-template.js` (70 lines)

**Functions:**
- `getTemplateExpressions(source)` [L3-L10]
  - 💥 *Blast Radius [1 direct, 5 transitive callers]*: `parseAngularTemplate` (tools/src/parser/angular-template.js:L15)
- `parseAngularTemplate(filePath, source, componentName = null)` [L12-L68]
  - 💥 *Blast Radius [2 direct, 11 transitive callers]*: `parseProjectFiles` (tools/src/parser/project-parser.js:L31), `parseTypeScriptFile` (tools/src/parser/typescript.js:L170)

### `tools/src/parser/ast-helpers.js` (78 lines)

**Functions:**
- `getLeadingComment(node, sourceLines)` [L1-L23]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (5 direct callers across 1 files, 8 transitive)**
- `getMaxBlockDepth(node, currentDepth = 0)` [L25-L40]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 2 files, 7 transitive)**
- `getParamCount(node)` [L42-L52]
  - 💥 *Blast Radius [3 direct, 7 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L203), `parseClassDeclaration` (tools/src/parser/javascript.js:L269), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L320)
- `getReturnCount(bodyNode)` [L54-L70]
  - 💥 *Blast Radius [3 direct, 7 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L204), `parseClassDeclaration` (tools/src/parser/javascript.js:L270), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L321)

### `tools/src/parser/csharp.js` (169 lines)

**Functions:**
- `nodeName(node)` [L12-L16]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 1 files, 4 transitive)**
- `analyzeBody(body)` [L18-L38]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `makeMethod` (tools/src/parser/csharp.js:L46)
- `makeMethod(node, className, filePath)` [L40-L66]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `parseCSharpSource` (tools/src/parser/csharp.js:L145)
- `parseCSharpSource(filePath, source)` [L68-L160]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `parseCSharpFiles` (tools/src/parser/csharp.js:L165)
- `parseCSharpFiles(files, displayPathForFile)` [L162-L167]
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `parseProjectFiles` (tools/src/parser/project-parser.js:L13)

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
  - 💥 *Blast Radius [3 direct, 7 transitive callers]*: `parseFunctionDeclaration` (tools/src/parser/javascript.js:L207), `parseClassDeclaration` (tools/src/parser/javascript.js:L273), `parseArrowOrFunctionExpression` (tools/src/parser/javascript.js:L324)
- `inspectTopLevelDeclarator(decl, isMutableBinding, fileCtx)` [L430-L458]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `harvestFileDecisions` (tools/src/parser/decision-harvester.js:L491)
- `inspectModuleExportsStatement(child, exportedSymbols)` [L460-L472]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `harvestFileDecisions` (tools/src/parser/decision-harvester.js:L495)
- `harvestFileDecisions(rootNode)` [L478-L505] — ** Harvests file-level structural decisions: module imports (external vs internal),*
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L458)

### `tools/src/parser/java.js` (195 lines)

**Functions:**
- `decode(value)` [L8-L10]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (6 direct callers across 2 files, 7 transitive)**
- `parseInteger(value)` [L12-L15]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (12 direct callers across 1 files, 6 transitive)**
- `createFileResult(filePath, source)` [L17-L28]
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `parseJavaFiles` (tools/src/parser/java.js:L45)
- `parseJavaFiles(files, displayPathForFile)` [L30-L182] 📏 [MONOLITHIC] 🔄 [DEPTH 7]
  - 💥 *Blast Radius [2 direct, 13 transitive callers]*: `parseJavaSource` (tools/src/parser/java.js:L189), `parseProjectFiles` (tools/src/parser/project-parser.js:L11)
- `parseJavaSource(filePath, source)` [L184-L193]
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L411)

### `tools/src/parser/javascript.js` (541 lines)

**Functions:**
- `handleCallExpression(node, callerSymbolId, enclosingClass, state)` [L30-L115] — ** Handles member and identifier call expressions, resolving receiver and bus signals.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `harvestNodeDetails` (tools/src/parser/javascript.js:L174)
- `handleNewExpression(node, callerSymbolId, state)` [L120-L134] — ** Handles class instantiation (new expression).*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `harvestNodeDetails` (tools/src/parser/javascript.js:L176)
- `handleEnumMemberExpression(node, callerSymbolId, state)` [L139-L164] — ** Handles enum or constant dictionary member reads.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `harvestNodeDetails` (tools/src/parser/javascript.js:L178)
- `harvestNodeDetails(bodyNode, callerSymbolId, enclosingClass, state)` [L169-L187] — ** Traverses a block body to collect outbound calls, instantiations, signals, and enum reads.*
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L434)
- `parseFunctionDeclaration(node, filePath, sourceLines, harvestDetails)` [L192-L230] — ** Parses a function declaration node.*
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L438)
- `parseClassDeclaration(node, filePath, sourceLines, harvestDetails)` [L235-L303] — ** Parses a class declaration node and its methods.*
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L443)
- `parseArrowOrFunctionExpression(node, varName, valueNode, filePath, sourceLines, harvestDetails)` [L311-L346] — ** Parses an arrow function or function expression assigned to a variable.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `parseVariableDeclaration` (tools/src/parser/javascript.js:L385)
- `parseObjectEnum(node, varName, valueNode, filePath, sourceLines)` [L351-L370] — ** Parses a constant object definition as a state enum or data table.*
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `parseVariableDeclaration` (tools/src/parser/javascript.js:L388)
- `parseVariableDeclaration(node, filePath, sourceLines, harvestDetails, symbols)` [L375-L392] — ** Parses variable declarations containing arrow functions, function expressions, or state enums.*
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L448)
- `extractScriptFromSvelte(sourceCode)` [L394-L403]
  - 💥 *Blast Radius [1 direct, 7 transitive callers]*: `parseFileAST` (tools/src/parser/javascript.js:L414)
- `parseFileAST(filePath, sourceCode)` [L409-L483] — ** Parses JavaScript/TypeScript source code using Tree-Sitter to extract structured symbols,*
  - 💥 *Blast Radius [2 direct, 13 transitive callers]*: `parseProjectFiles` (tools/src/parser/project-parser.js:L32), `computeGitDecisionDiff` (tools/src/vcs/decision-diff.js:L464)
- `isIgnoredEntry(entryName, customIgnore)` [L491-L497]
  - 💥 *Blast Radius [1 direct, 11 transitive callers]*: `collectFiles` (tools/src/parser/javascript.js:L521)
- `collectFiles(targetPath)` [L502-L531] — ** Recursively collects JavaScript source files from target directory.*
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (4 direct callers across 4 files, 16 transitive)**

### `tools/src/parser/journey-facts.js` (124 lines)

**Functions:**
- `normalized(value)` [L8-L10]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (7 direct callers across 1 files, 5 transitive)**
- `elementText(node)` [L12-L15]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `htmlFacts` (tools/src/parser/journey-facts.js:L36)
- `htmlFacts(source)` [L17-L46]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `extractJourneyFacts` (tools/src/parser/journey-facts.js:L109)
- `typeScriptFacts(filePath, source)` [L48-L82]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `extractJourneyFacts` (tools/src/parser/journey-facts.js:L110)
- `csharpFacts(source)` [L84-L105]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `extractJourneyFacts` (tools/src/parser/journey-facts.js:L111)
- `extractJourneyFacts(filePath, source)` [L107-L113]
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `compareJourneyFacts` (tools/src/parser/journey-facts.js:L116), `compareJourneyFacts` (tools/src/parser/journey-facts.js:L117)
- `compareJourneyFacts(filePath, before, after)` [L115-L122]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `snapshotsFromChanges` (tools/src/commands/journey.js:L113)

### `tools/src/parser/project-parser.js` (48 lines)

**Functions:**
- `parseProjectFiles(files, rootDir)` [L9-L46]
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `main` (tools/ast-outline.js:L89), `buildGraphIndex` (tools/cli.js:L87)

### `tools/src/parser/typescript.js` (194 lines)

**Functions:**
- `sourceLine(sourceFile, position)` [L15-L17]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **CRITICAL (8 direct callers across 1 files, 6 transitive)**
- `getMetrics(body)` [L19-L44]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `makeFunction` (tools/src/parser/typescript.js:L83)
- `extractCalls(body, callerSymbolId, className, sourceFile, rawCalls, rawInstantiations)` [L46-L77]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `makeFunction` (tools/src/parser/typescript.js:L85)
- `makeFunction(node, name, filePath, sourceFile, rawCalls, rawInstantiations, parentClass = null)` [L79-L105]
  - 💥 *Blast Radius [3 direct, 4 transitive callers]*: `parseTypeScriptFile` (tools/src/parser/typescript.js:L161), `parseTypeScriptFile` (tools/src/parser/typescript.js:L183), `parseTypeScriptFile` (tools/src/parser/typescript.js:L185)
- `getAngularMetadata(classNode, sourceFile)` [L107-L125]
  - 💥 *Blast Radius [1 direct, 4 transitive callers]*: `parseTypeScriptFile` (tools/src/parser/typescript.js:L166)
- `parseTypeScriptFile(filePath, source)` [L127-L192]
  - 💥 *Blast Radius [1 direct, 10 transitive callers]*: `parseProjectFiles` (tools/src/parser/project-parser.js:L22)

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
  - 💥 *Blast Radius [2 direct, 4 transitive callers]*: `handleReviewCommand` (tools/cli.js:L177), `handleDiffCommand` (tools/cli.js:L259)
- `diffGraphSnapshots(baseGraph, targetGraph, label = 'Baseline Snapshot')` [L505-L607] — ** Compares two full Graph IR objects (e.g. a saved baseline ast_graph.json vs current Graph IR)*
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `handleDiffCommand` (tools/cli.js:L226)

### `tools/src/vcs/git-diff.js` (96 lines)

**Functions:**
- `isGitRepo(cwd = process.cwd())` [L3-L13]
  - 💥 *Blast Radius [1 direct, 6 transitive callers]*: `getChangedLinesFromDiff` (tools/src/vcs/git-diff.js:L16)
- `getChangedLinesFromDiff(gitRef = 'HEAD', cwd = process.cwd())` [L15-L72]
  - 💥 *Blast Radius [Risk: CRITICAL HOTSPOT]*: **MEDIUM (4 direct callers across 2 files, 5 transitive)**
- `intersectDiffWithSymbols(diffMap, index)` [L74-L90]
  - 💥 *Blast Radius [3 direct, 4 transitive callers]*: `main` (tools/ast-outline.js:L98), `main` (tools/ast-outline.js:L128), `handleDiffCommand` (tools/cli.js:L242)

## Subsystem Layer: Application / Controllers

### `tools/src/commands/blast.js` (64 lines)

**Functions:**
- `runBlastCommand(blastTarget, blastIndex)` [L8-L59] — ** Executes a targeted blast radius and risk query for a given symbol identifier.*
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `main` (tools/ast-outline.js:L173), `handleBlastCommand` (tools/cli.js:L158)

### `tools/src/commands/concept.js` (97 lines)

**Functions:**
- `formatConceptOutput(result)` [L6-L71] — ** Formats concept resolution diagnostics for CLI stdout.*
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `runConceptCommand` (tools/src/commands/concept.js:L88), `runInspectCommand` (tools/src/commands/inspect.js:L283)
- `runConceptCommand(conceptQuery, blastIndex, options = {})` [L76-L91] — ** Executes the concept query command, supporting human-readable output and JSON.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L181)

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
  - 💥 *Blast Radius [2 direct, 2 transitive callers]*: `main` (tools/cli.js:L439), `main` (tools/conversation-analyzer.js:L83)

### `tools/src/commands/decisions.js` (425 lines)

**Functions:**
- `formatParamBrief(p)` [L17-L25]
- `buildSymbolDecisionCard(symbolId, blastIndex)` [L30-L90] — ** Builds a structured Decision Card object for a symbol in the blastIndex.*
  - 💥 *Blast Radius [3 direct, 5 transitive callers]*: `summarizeCodebaseDecisions` (tools/src/commands/decisions.js:L184), `runDecisionsCommand` (tools/src/commands/decisions.js:L389), `runDecisionsCommand` (tools/src/commands/decisions.js:L398)
- `formatSymbolDecisionCard(card)` [L95-L165] — ** Formats a single Symbol Decision Card for readable terminal output.*
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `runDecisionsCommand` (tools/src/commands/decisions.js:L393), `runDecisionsCommand` (tools/src/commands/decisions.js:L402)
- `summarizeCodebaseDecisions(allFileResults, blastIndex, rootDir, filterTarget = null)` [L170-L233] — ** Formats a high-level codebase or file Decision Summary when no single symbol is targeted.*
  - 💥 *Blast Radius [2 direct, 4 transitive callers]*: `handleReviewCommand` (tools/cli.js:L175), `runDecisionsCommand` (tools/src/commands/decisions.js:L408)
- `formatCodebaseDecisionSummary(summary)` [L235-L283]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `runDecisionsCommand` (tools/src/commands/decisions.js:L412)
- `formatDecisionDiffReport(decisionDiff, changedReport = [])` [L288-L380] — ** Formats a Git Decision Diff report into a concise Reviewer Decision Scorecard.*
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `handleDiffCommand` (tools/cli.js:L236), `handleDiffCommand` (tools/cli.js:L270)
- `runDecisionsCommand(targetQuery, allFileResults, blastIndex, rootDir, options = {})` [L385-L415] — ** CLI runner for `codereview decisions [targetSymbolOrFile]`*
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `handleDecisionsCommand` (tools/cli.js:L203)

### `tools/src/commands/export.js` (28 lines)

**Functions:**
- `runExportCommand(exportGraph, allFileResults, blastIndex, rootDir, changedSymbolIds)` [L8-L23] — ** Exports complete Graph IR to JSON and synchronizes data.js for D3 visualization.*
  - 💥 *Blast Radius [3 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L106), `main` (tools/ast-outline.js:L121), `main` (tools/ast-outline.js:L185)

### `tools/src/commands/improve.js` (118 lines)

**State Enums & Data Tables:**
- `COLORS` [L9-L18]: `reset, bold, dim, green, yellow, cyan, red, magenta`
  - 💥 *Blast Radius: CRITICAL (60 direct callers across 2 files, 13 transitive)*

**Functions:**
- `runFeedbackCommand(message, options = {}, targetDir = '.')` [L23-L48] — ** Handles explicit feedback logging from agents or developers.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L443)
- `printImprovementReport(summary, rootDir)` [L53-L84] — ** Formats and prints feedback summary report to the console.*
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runImproveCommand` (tools/src/commands/improve.js:L110)
- `runImproveCommand(targetDir = '.', options = {})` [L89-L112] — ** Analyzes telemetry and generates recommendations or applies auto-improvements.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L446)

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

### `tools/src/commands/journey.js` (249 lines)

**Functions:**
- `validateItems(items, kind)` [L7-L14]
  - 💥 *Blast Radius [3 direct, 3 transitive callers]*: `readManifest` (tools/src/commands/journey.js:L21), `readManifest` (tools/src/commands/journey.js:L22), `readManifest` (tools/src/commands/journey.js:L25)
- `readManifest(filePath)` [L16-L28]
  - 💥 *Blast Radius [2 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L214), `runJourneyCommand` (tools/src/commands/journey.js:L237)
- `validateEvidence(evidence = [])` [L30-L37]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `validateItems` (tools/src/commands/journey.js:L12)
- `parseOptions(args)` [L39-L60]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L232)
- `git(repoPath, args)` [L62-L64]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 1 files, 5 transitive)**
- `repositoryChanges(repo, repoPath, base, target)` [L66-L86]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L235)
- `referencedFiles(manifest)` [L88-L93]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L240)
- `sourceAtRevision(repoPath, file, revision)` [L95-L98]
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `snapshotsFromChanges` (tools/src/commands/journey.js:L111), `snapshotsFromChanges` (tools/src/commands/journey.js:L112)
- `snapshotsFromChanges(beforeManifest, afterManifest, changes, settings)` [L100-L126]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L238)
- `formatWalkthrough(manifest, selectedId, selectedStep)` [L128-L156]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L226)
- `formatDiff(result)` [L158-L207]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L245)
- `runJourneyCommand(args, options = {})` [L209-L247]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/cli.js:L415)

### `tools/src/commands/lint.js` (99 lines)

**Functions:**
- `runLintCommand(allFileResults, blastIndex, rootDir)` [L7-L94] — ** Runs the static code complexity and architectural hotspot linter.*
  - 💥 *Blast Radius [3 direct, 4 transitive callers]*: `main` (tools/ast-outline.js:L124), `main` (tools/ast-outline.js:L156), `handleLintCommand` (tools/cli.js:L278)

### `tools/src/commands/map.js` (26 lines)

**Functions:**
- `runMapCommand(writeMap, allFileResults, blastIndex, rootDir)` [L8-L21] — ** Generates Markdown AST symbol map and either writes it to disk or prints to stdout.*
  - 💥 *Blast Radius [3 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L105), `main` (tools/ast-outline.js:L120), `main` (tools/ast-outline.js:L235)

### `tools/src/commands/mermaid.js` (15 lines)

**Functions:**
- `runMermaidCommand(mermaidTarget, blastIndex)` [L6-L10] — ** Generates and prints a Mermaid dependency flowchart for a given symbol.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L169)

### `tools/src/commands/query.js` (104 lines)

**Functions:**
- `sanitizeQuery(rawQuery)` [L10-L24] — ** Sanitizes search queries and extracts declaration keywords.*
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `generateInspectionData` (tools/src/commands/inspect.js:L67), `runQueryCommand` (tools/src/commands/query.js:L35)
- `runQueryCommand(rawQuery, blastIndex, options = {})` [L34-L98] — ** Searches the symbol catalog for items matching a query string.*
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `main` (tools/ast-outline.js:L177)

### `tools/src/commands/review.js` (284 lines)

**Functions:**
- `checkSymbolFindings(card)` [L11-L119]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `generateCoachingReview` (tools/src/commands/review.js:L182)
- `generateCoachingReview(summary, blastIndex, decisionDiff = null)` [L124-L197] — ** Generates a structured Coaching & Mentoring Review from a codebase decision summary and blastIndex.*
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `handleReviewCommand` (tools/cli.js:L178)
- `formatSingleDiffQuestion(sym, d)` [L199-L216]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `collectDiffQuestions` (tools/src/commands/review.js:L224)
- `collectDiffQuestions(decisionDiff)` [L218-L229]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `generateCoachingReview` (tools/src/commands/review.js:L195)
- `formatCoachingReview(review)` [L231-L277]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `handleReviewCommand` (tools/cli.js:L183)

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
  - 💥 *Blast Radius [2 direct, 15 transitive callers]*: `main` (tools/ast-outline.js:L92), `buildGraphIndex` (tools/cli.js:L89)
- `resolveSymbolIds(target, blastIndex)` [L306-L333] — ** Resolves a symbol query (bare name, Class.method, Class#method, file#symbol, or full ID) to matching catalog IDs.*
  - 💥 *Blast Radius [3 direct, 8 transitive callers]*: `runBlastCommand` (tools/src/commands/blast.js:L9), `runDecisionsCommand` (tools/src/commands/decisions.js:L387), `generateMermaidDiagram` (tools/src/exporters/mermaid.js:L6)

### `tools/src/graph/journey.js` (107 lines)

**Functions:**
- `fileKey(file)` [L1-L3]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 1 files, 5 transitive)**
- `indexById(items = [])` [L5-L7]
  - 💥 *Blast Radius [Risk: HIGH]*: **MEDIUM (4 direct callers across 1 files, 4 transitive)**
- `sameValue(before, after)` [L9-L11]
  - 💥 *Blast Radius [2 direct, 5 transitive callers]*: `changedFields` (tools/src/graph/journey.js:L14), `compareJourneySnapshots` (tools/src/graph/journey.js:L90)
- `changedFields(before, after, fields)` [L13-L20]
  - 💥 *Blast Radius [2 direct, 4 transitive callers]*: `compareItems` (tools/src/graph/journey.js:L66), `compareJourneySnapshots` (tools/src/graph/journey.js:L85)
- `changedFiles(beforeFiles = [], afterFiles = [])` [L22-L41]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `compareJourneySnapshots` (tools/src/graph/journey.js:L74)
- `evidenceChanges(before, after, files, mapped)` [L43-L54]
  - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `compareItems` (tools/src/graph/journey.js:L67)
- `compareItems(beforeItems, afterItems, files, mapped, fields)` [L56-L71]
  - 💥 *Blast Radius [2 direct, 3 transitive callers]*: `compareJourneySnapshots` (tools/src/graph/journey.js:L93), `compareJourneySnapshots` (tools/src/graph/journey.js:L97)
- `compareJourneySnapshots(before, after, rationale = null)` [L73-L105]
  - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `runJourneyCommand` (tools/src/commands/journey.js:L239)

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

### `tools/src/exporters/graph-ir.js` (104 lines)

**Functions:**
- `exportGraphIR(allFileResults, blastIndex, rootDir, changedSymbolIds = new Set())` [L6-L99]
  - 💥 *Blast Radius [3 direct, 16 transitive callers]*: `main` (tools/ast-outline.js:L160), `buildGraphIndex` (tools/cli.js:L90), `runExportCommand` (tools/src/commands/export.js:L9)

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
  - 💥 *Blast Radius [2 direct, 7 transitive callers]*: `handleSyncCommand` (tools/cli.js:L287), `runMapCommand` (tools/src/commands/map.js:L9)

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

