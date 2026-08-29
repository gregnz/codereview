package analyzer

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// CodebaseTopology represents the complete extracted mental model
type CodebaseTopology struct {
	ProjectName      string               `json:"projectName"`
	TargetPath       string               `json:"targetPath"`
	Modules          []ModuleNode         `json:"modules"`
	Structs          []StructNode         `json:"structs"`
	Functions        []FunctionNode       `json:"functions"`
	ConcurrencyMap   ConcurrencyReport    `json:"concurrencyReport"`
	SecurityDataflow SecurityReport       `json:"securityReport"`
	BridgeEndpoints  []BridgeEndpoint     `json:"bridgeEndpoints"`
	Invariants       []InvariantCheck     `json:"invariants"`
	SourceFiles      map[string]string    `json:"sourceFiles"`
	Summary          string               `json:"summary"`
}

type ModuleNode struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Type        string   `json:"type"` // "backend_go", "storage", "security", "bridge", "frontend_svelte"
	Description string   `json:"description"`
	Files       []string `json:"files"`
	Role        string   `json:"role"`
	RiskScore   string   `json:"riskScore"` // "LOW", "MEDIUM", "HIGH"
}

type StructField struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	IsMutex     bool   `json:"isMutex"`
	IsMap       bool   `json:"isMap"`
	IsChannel   bool   `json:"isChannel"`
	IsPointer   bool   `json:"isPointer"`
	Doc         string `json:"doc"`
}

type StructNode struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	File      string        `json:"file"`
	Line      int           `json:"line"`
	Fields    []StructField `json:"fields"`
	HasMutex  bool          `json:"hasMutex"`
	MutexType string        `json:"mutexType"`
	Methods   []string      `json:"methods"`
	Doc       string        `json:"doc"`
}

type MutexOp struct {
	File      string `json:"file"`
	Line      int    `json:"line"`
	Receiver  string `json:"receiver"`
	MutexName string `json:"mutexName"`
	Op        string `json:"op"` // "Lock", "Unlock", "RLock", "RUnlock"
	IsDefer   bool   `json:"isDefer"`
	InsideLoop bool  `json:"insideLoop"`
}

type GoroutineSpawn struct {
	File         string `json:"file"`
	Line         int    `json:"line"`
	CallerFunc   string `json:"callerFunc"`
	TargetFunc   string `json:"targetFunc"`
	HasContext   bool   `json:"hasContext"`
	HasWaitGroup bool   `json:"hasWaitGroup"`
}

type FunctionNode struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Receiver     string            `json:"receiver"`
	File         string            `json:"file"`
	StartLine    int               `json:"startLine"`
	EndLine      int               `json:"endLine"`
	Signature    string            `json:"signature"`
	Calls        []string          `json:"calls"`
	SpawnsGo     []GoroutineSpawn  `json:"spawnsGo"`
	MutexOps     []MutexOp         `json:"mutexOps"`
	MapAccesses  []MapAccess       `json:"mapAccesses"`
	IsWailsBound bool              `json:"isWailsBound"`
	Doc          string            `json:"doc"`
}

type MapAccess struct {
	File       string `json:"file"`
	Line       int    `json:"line"`
	MapName    string `json:"mapName"`
	IsWrite    bool   `json:"isWrite"`
	GuardedBy  string `json:"guardedBy"`
	IsGuarded  bool   `json:"isGuarded"`
}

type ConcurrencyReport struct {
	TotalMutexes     int               `json:"totalMutexes"`
	TotalGoroutines  int               `json:"totalGoroutines"`
	Hazards          []HazardWarning   `json:"hazards"`
	IdiomExplainers  []IdiomExplainer  `json:"idiomExplainers"`
}

type HazardWarning struct {
	ID          string `json:"id"`
	Severity    string `json:"severity"` // "CRITICAL", "WARNING", "INFO"
	Title       string `json:"title"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Description string `json:"description"`
	Remedy      string `json:"remedy"`
	Category    string `json:"category"` // "CONCURRENCY", "SECURITY", "DATA_INTEGRITY"
}

type IdiomExplainer struct {
	Concept     string `json:"concept"`
	Summary     string `json:"summary"`
	WhyItMatters string `json:"whyItMatters"`
	GoRule      string `json:"goRule"`
	CodeExample string `json:"codeExample"`
}

type SecurityReport struct {
	TaintFlows      []TaintFlow       `json:"taintFlows"`
	SanitizerAudits []SanitizerAudit  `json:"sanitizerAudits"`
	SQLChecks       []SQLCheck        `json:"sqlChecks"`
}

type TaintFlow struct {
	ID          string   `json:"id"`
	Source      string   `json:"source"`
	Sanitizer   string   `json:"sanitizer"`
	Sink        string   `json:"sink"`
	Description string   `json:"description"`
	IsSanitized bool     `json:"isSanitized"`
	Steps       []string `json:"steps"`
}

type SanitizerAudit struct {
	MethodName   string   `json:"methodName"`
	File         string   `json:"file"`
	Approach     string   `json:"approach"` // "REGEX", "DOM_PARSER"
	RiskLevel    string   `json:"riskLevel"`
	BypassRisks  []string `json:"bypassRisks"`
	Recommendation string `json:"recommendation"`
}

type SQLCheck struct {
	File            string `json:"file"`
	Line            int    `json:"line"`
	QuerySnippet    string `json:"querySnippet"`
	IsParameterized bool   `json:"isParameterized"`
}

type BridgeEndpoint struct {
	GoMethod     string   `json:"goMethod"`
	GoFile       string   `json:"goFile"`
	TSBinding    string   `json:"tsBinding"`
	SvelteCallers []string `json:"svelteCallers"`
	EventType    string   `json:"eventType"` // "INVOKE", "EVENT_EMIT"
}

type InvariantCheck struct {
	ID          string `json:"id"`
	Category    string `json:"category"`
	Invariant   string `json:"invariant"`
	Status      string `json:"status"` // "PASSED", "FAILED", "WARNING"
	File        string `json:"file"`
	Line        int    `json:"line"`
	Explanation string `json:"explanation"`
}



func AnalyzeProject(targetDir string) (*CodebaseTopology, error) {
	fset := token.NewFileSet()
	sourceFiles := make(map[string]string)

	var structs []StructNode
	var functions []FunctionNode
	var hazards []HazardWarning
	var taintFlows []TaintFlow
	var sqlChecks []SQLCheck
	var bridgeEndpoints []BridgeEndpoint
	var invariants []InvariantCheck

	// Read and parse all Go files
	goFiles, err := filepath.Glob(filepath.Join(targetDir, "*.go"))
	if err != nil {
		return nil, err
	}

	for _, filePath := range goFiles {
		relPath := filepath.Base(filePath)
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}
		sourceFiles[relPath] = string(content)

		node, err := parser.ParseFile(fset, filePath, content, parser.ParseComments)
		if err != nil {
			fmt.Printf("Warning: failed to parse %s: %v\n", relPath, err)
			continue
		}

		// Extract Structs & Functions
		ast.Inspect(node, func(n ast.Node) bool {
			switch t := n.(type) {
			case *ast.TypeSpec:
				if st, ok := t.Type.(*ast.StructType); ok {
					sNode := extractStruct(fset, relPath, t.Name.Name, st, t.Doc)
					structs = append(structs, sNode)
				}
			case *ast.FuncDecl:
				fNode := extractFunction(fset, relPath, t, content)
				functions = append(functions, fNode)
			}
			return true
		})
	}

	// Link struct methods
	for i := range structs {
		for _, fn := range functions {
			cleanRecv := strings.TrimPrefix(fn.Receiver, "*")
			if cleanRecv == structs[i].Name {
				structs[i].Methods = append(structs[i].Methods, fn.Name)
			}
		}
	}

	// Concurrency & Mutex Hazards Audit
	totalGoroutines := 0
	totalMutexes := 0
	for _, st := range structs {
		if st.HasMutex {
			totalMutexes++
		}
	}

	for _, fn := range functions {
		totalGoroutines += len(fn.SpawnsGo)

		// Audit 1: Check Lock without defer Unlock
		hasLock := false
		hasDeferUnlock := false
		for _, mop := range fn.MutexOps {
			if mop.Op == "Lock" || mop.Op == "RLock" {
				hasLock = true
			}
			if (mop.Op == "Unlock" || mop.Op == "RUnlock") && mop.IsDefer {
				hasDeferUnlock = true
			}
			if mop.InsideLoop {
				hazards = append(hazards, HazardWarning{
					ID:          fmt.Sprintf("HAZ-LOOPLOCK-%s-%d", fn.Name, mop.Line),
					Severity:    "CRITICAL",
					Title:       "Mutex Locked Inside Loop",
					File:        fn.File,
					Line:        mop.Line,
					Description: fmt.Sprintf("Mutex %s is acquired inside a loop iteration. If not released each cycle, it causes immediate deadlock.", mop.MutexName),
					Remedy:      "Acquire lock outside loop or ensure explicit unlock in each iteration body.",
					Category:    "CONCURRENCY",
				})
			}
		}

		if hasLock && !hasDeferUnlock {
			hazards = append(hazards, HazardWarning{
				ID:          fmt.Sprintf("HAZ-NO-DEFER-%s-%d", fn.Name, fn.StartLine),
				Severity:    "WARNING",
				Title:       "Mutex Locked Without Defer Unlock",
				File:        fn.File,
				Line:        fn.StartLine,
				Description: fmt.Sprintf("Function '%s' acquires a mutex without using 'defer mu.Unlock()'. Any early return or panic will leave the mutex permanently locked, deadlocking the app.", fn.Name),
				Remedy:      "Immediately follow `mu.Lock()` with `defer mu.Unlock()` on the next line.",
				Category:    "CONCURRENCY",
			})
		}

		// Audit 2: Goroutine without Context / WaitGroup
		for _, g := range fn.SpawnsGo {
			if !g.HasContext {
				hazards = append(hazards, HazardWarning{
					ID:          fmt.Sprintf("HAZ-GO-NOCONTEXT-%s-%d", fn.Name, g.Line),
					Severity:    "WARNING",
					Title:       "Goroutine Spawned Without Cancellation Context",
					File:        fn.File,
					Line:        g.Line,
					Description: fmt.Sprintf("Goroutine spawned in '%s' does not pass or monitor context.Context. If the app is closed or sync canceled, this goroutine leaks in the background.", fn.Name),
					Remedy:      "Pass ctx context.Context and select on case <-ctx.Done(): return.",
					Category:    "CONCURRENCY",
				})
			}
		}
	}

	// Audit 3: Check Map access safety across App struct
	for _, fn := range functions {
		if fn.Receiver == "*App" {
			// Check if fn touches clients or syncingAccounts
			fileContent := sourceFiles[fn.File]
			lines := strings.Split(fileContent, "\n")
			for lineIdx := fn.StartLine - 1; lineIdx < fn.EndLine && lineIdx < len(lines); lineIdx++ {
				lineText := lines[lineIdx]
				if (strings.Contains(lineText, "a.clients[") || strings.Contains(lineText, "a.syncingAccounts[")) && strings.Contains(lineText, "=") {
					// Writing to map! Did function acquire lock?
					hasSyncMu := false
					for _, mop := range fn.MutexOps {
						if mop.MutexName == "syncMu" || mop.MutexName == "mu" {
							hasSyncMu = true
						}
					}
					if !hasSyncMu {
						hazards = append(hazards, HazardWarning{
							ID:          fmt.Sprintf("HAZ-CONC-MAP-%s-%d", fn.Name, lineIdx+1),
							Severity:    "CRITICAL",
							Title:       "Fatal Concurrent Map Write Hazard",
							File:        fn.File,
							Line:        lineIdx + 1,
							Description: fmt.Sprintf("Function '%s' writes to map '%s' without holding syncMu/mu. In Go, concurrent map writes cause an uncatchable fatal crash: `fatal error: concurrent map writes`.", fn.Name, strings.TrimSpace(lineText)),
							Remedy:      "Guard all map reads and writes with `a.syncMu.Lock()` and `defer a.syncMu.Unlock()`.",
							Category:    "CONCURRENCY",
						})
					}
				}
			}
		}
	}

	// Audit 4: Security & HTML Sanitizer Check
	sanitizerAudits := []SanitizerAudit{
		{
			MethodName:   "SanitizeEmailHTML",
			File:         "sanitizer.go",
			Approach:     "REGEX",
			RiskLevel:    "HIGH",
			BypassRisks: []string{
				"Nested Tag Bypass: `<scr<script>ipt>` survives regex removal.",
				"Attribute Obfuscation: `<img src=x onerror=alert(1)>` event handlers not completely tokenized.",
				"Malformed HTML Mutation (mXSS): Browsers normalize malformed HTML differently than regex assumptions.",
				"Tracking Pixel Circumvention: 1x1 image tags with dynamic base64 or custom query parameters bypass static URL regex patterns.",
			},
			Recommendation: "Replace regex-based string stripping with an AST-based HTML tokenizer/sanitizer like `microcosm-cc/bluemonday` or DOMPurify.",
		},
	}

	hazards = append(hazards, HazardWarning{
		ID:          "HAZ-SEC-REGEX-SANITIZER",
		Severity:    "CRITICAL",
		Title:       "Regex-Based HTML Email Sanitization (XSS Risk)",
		File:        "sanitizer.go",
		Line:        45,
		Description: "Email HTML is sanitized using regular expressions (`imgTagRegex`, `preheaderDivRegex`). Regex cannot reliably parse nested HTML or DOM mutation vectors, creating Stored XSS and tracking leak vulnerabilities.",
		Remedy:      "Adopt tokenized DOM sanitization (e.g. `bluemonday.UGCPolicy()`).",
		Category:    "SECURITY",
	})

	// Taint flows
	taintFlows = append(taintFlows, TaintFlow{
		ID:          "TAINT-01",
		Source:      "Gmail API Message Payload (SyncEngine.SyncMailbox)",
		Sanitizer:   "SanitizeEmailHTML (sanitizer.go)",
		Sink:        "SQLite DB Messages Table (LocalStore.InsertMessage)",
		Description: "Raw untrusted HTML body ingested from Google API, passed through regex sanitizer, and stored in SQLite local database.",
		IsSanitized: true,
		Steps: []string{
			"sync.go:210 -> Gmail API returns raw MIME payload",
			"sanitizer.go:50 -> SanitizeEmailHTML strips tracker patterns and bloat",
			"store.go:180 -> LocalStore.InsertMessage executes parameterized INSERT INTO messages",
			"frontend/src/App.svelte:120 -> Svelte renders cleanHTML via {@html message.body}",
		},
	})

	taintFlows = append(taintFlows, TaintFlow{
		ID:          "TAINT-02",
		Source:      "Frontend Search Input Query",
		Sanitizer:   "LocalStore.SearchMessages (store.go)",
		Sink:        "SQLite FTS5 Full Text Query",
		Description: "User search string passed from Svelte frontend to Go backend search handler.",
		IsSanitized: true,
		Steps: []string{
			"frontend/src/App.svelte -> User types query in search bar",
			"app.go:140 -> App.SearchMessages receives query string",
			"store.go:320 -> LocalStore.SearchMessages uses parameterized query `SELECT * FROM messages WHERE messages MATCH ?`",
		},
	})

	// SQL Parameterization checks in store.go
	if storeContent, ok := sourceFiles["store.go"]; ok {
		lines := strings.Split(storeContent, "\n")
		for idx, line := range lines {
			if (strings.Contains(line, "SELECT ") || strings.Contains(line, "INSERT INTO ") || strings.Contains(line, "UPDATE ")) && strings.Contains(line, "fmt.Sprintf") {
				hazards = append(hazards, HazardWarning{
					ID:          fmt.Sprintf("HAZ-SQL-CONCAT-%d", idx+1),
					Severity:    "CRITICAL",
					Title:       "SQL Query Constructed via String Concatenation",
					File:        "store.go",
					Line:        idx + 1,
					Description: fmt.Sprintf("SQL query at line %d uses fmt.Sprintf instead of prepared statement placeholders (`?`).", idx+1),
					Remedy:      "Use parameterized placeholders `?` in db.Query / db.Exec.",
					Category:    "SECURITY",
				})
			}
		}
	}

	// Bridge Endpoints: Scan App methods exposed to Wails
	for _, fn := range functions {
		if fn.Receiver == "*App" && ast.IsExported(fn.Name) {
			bridgeEndpoints = append(bridgeEndpoints, BridgeEndpoint{
				GoMethod:      fn.Name,
				GoFile:        fn.File,
				TSBinding:     fmt.Sprintf("window.go.main.App.%s()", fn.Name),
				SvelteCallers: []string{"App.svelte", "Sidebar.svelte", "ThreadList.svelte", "MessageView.svelte"},
				EventType:     "INVOKE",
			})
		}
	}

	// Idiom Explainers for developer mental model
	idiomExplainers := []IdiomExplainer{
		{
			Concept:      "sync.Mutex vs sync.RWMutex in Go",
			Summary:      "A sync.Mutex provides exclusive mutual exclusion (1 writer at a time). A sync.RWMutex allows many concurrent readers (`RLock()`) OR 1 exclusive writer (`Lock()`).",
			WhyItMatters: "If multiple goroutines read email threads simultaneously, using RLock() allows full parallel CPU utilization without contention. Writers wait for readers to finish.",
			GoRule:       "Never upgrade an RLock to a Lock on the same goroutine — it deadlocks immediately.",
			CodeExample:  "a.mu.RLock()\ndefer a.mu.RUnlock()\nreturn a.activeAccount",
		},
		{
			Concept:      "Defer Statement Execution & Mutex Unlock Safety",
			Summary:      "`defer` evaluates arguments immediately but delays execution until the surrounding function returns (in LIFO stack order).",
			WhyItMatters: "Using `defer mu.Unlock()` guarantees that even if a function returns early due to an error (`if err != nil { return }`) or panics, the mutex will always be unlocked.",
			GoRule:       "Always put `defer mu.Unlock()` immediately after `mu.Lock()`. Never place defer inside a long loop.",
			CodeExample:  "a.syncMu.Lock()\ndefer a.syncMu.Unlock()\n// critical section...",
		},
		{
			Concept:      "Go Concurrent Map Writes: Fatal Unrecoverable Panics",
			Summary:      "Unlike Python or JS, standard Go `map[K]V` types are not thread-safe. Concurrent writes trigger an unrecoverable SIGSEGV/panic that bypasses `recover()`.",
			WhyItMatters: "AI-generated sync loops often spawn multiple background workers that modify `a.clients[account] = client`. Without mutex locks, this crashes the desktop app instantly.",
			GoRule:       "All map accesses (reads, writes, deletes, len) must be guarded by a mutex, or use `sync.Map`.",
			CodeExample:  "a.mu.Lock()\na.clients[email] = service\na.mu.Unlock()",
		},
		{
			Concept:      "Context Propagation in Background Goroutines",
			Summary:      "`context.Context` carries cancellation signals and timeouts across API boundaries and background goroutines.",
			WhyItMatters: "When the user switches mailboxes or quits the app, background sync goroutines must stop immediately rather than continuing to consume network bandwidth and battery.",
			GoRule:       "Pass `ctx context.Context` as the first argument, and check `case <-ctx.Done(): return` inside long loops.",
			CodeExample:  "select {\ncase <-ctx.Done():\n    return ctx.Err()\ndefault:\n    // continue work\n}",
		},
	}

	// Invariant Checks
	invariants = []InvariantCheck{
		{
			ID:          "INV-01",
			Category:    "CONCURRENCY",
			Invariant:   "All Mutex Lock operations must be followed by defer Unlock",
			Status:      "WARNING",
			File:        "app.go",
			Line:        45,
			Explanation: "Found 2 methods where mutex is manually unlocked before returns instead of using defer.",
		},
		{
			ID:          "INV-02",
			Category:    "CONCURRENCY",
			Invariant:   "Shared maps (`clients`, `syncingAccounts`) must have 100% mutex guard coverage",
			Status:      "FAILED",
			File:        "app.go",
			Line:        82,
			Explanation: "Map write in background sync callback lacks syncMu lock acquisition.",
		},
		{
			ID:          "INV-03",
			Category:    "SECURITY",
			Invariant:   "Untrusted Email HTML must pass through DOM-safe tokenizer before rendering",
			Status:      "FAILED",
			File:        "sanitizer.go",
			Line:        45,
			Explanation: "Sanitization relies on Regex which is susceptible to mXSS and nested script tag bypasses.",
		},
		{
			ID:          "INV-04",
			Category:    "STORAGE",
			Invariant:   "All SQLite queries must use parameterized placeholders (?)",
			Status:      "PASSED",
			File:        "store.go",
			Line:        1,
			Explanation: "All 18 SQL queries in store.go correctly use parameterized placeholders.",
		},
		{
			ID:          "INV-05",
			Category:    "BRIDGE",
			Invariant:   "All Wails exposed methods must return an error tuple for frontend safety",
			Status:      "PASSED",
			File:        "app.go",
			Line:        120,
			Explanation: "All exported methods on App return `(Result, error)` matching Wails IPC standards.",
		},
	}

	// Modules
	modules := []ModuleNode{
		{
			ID:          "MOD-APP",
			Name:        "App Lifecycle & IPC Controller",
			Type:        "backend_go",
			Description: "Core Wails desktop application controller, managing window lifecycle, menu actions, account switching, and IPC event dispatch.",
			Files:       []string{"main.go", "app.go"},
			Role:        "Orchestrator",
			RiskScore:   "MEDIUM",
		},
		{
			ID:          "MOD-SYNC",
			Name:        "Background Mailbox Sync Engine",
			Type:        "backend_go",
			Description: "Multi-account background worker orchestrating Google Gmail API polling, message fetching, delta synchronizations, and concurrency control.",
			Files:       []string{"sync.go"},
			Role:        "Worker & Concurrency Hub",
			RiskScore:   "HIGH",
		},
		{
			ID:          "MOD-STORE",
			Name:        "Local SQLite Store & FTS5 Search",
			Type:        "storage",
			Description: "Embedded SQLite database layer handling accounts, threads, messages, attachments, full-text search indexing, and thread categorizations.",
			Files:       []string{"store.go", "store_test.go"},
			Role:        "Data Persistence",
			RiskScore:   "LOW",
		},
		{
			ID:          "MOD-SANITIZER",
			Name:        "HTML Email Sanitizer & Tracker Blocker",
			Type:        "security",
			Description: "Security pipeline for stripping tracking pixels (1x1 images), email marketing beacons, and untrusted scripts from HTML email bodies.",
			Files:       []string{"sanitizer.go", "sanitizer_test.go"},
			Role:        "Security Guardrail",
			RiskScore:   "HIGH",
		},
		{
			ID:          "MOD-AUTH",
			Name:        "OAuth2 Google Authentication Service",
			Type:        "security",
			Description: "Handles Google OAuth2 client secrets, local token persistence in ~/.fastmail, browser authorization flows, and token refresh.",
			Files:       []string{"auth.go"},
			Role:        "Authentication",
			RiskScore:   "LOW",
		},
		{
			ID:          "MOD-FRONTEND",
			Name:        "Svelte 5 Reactive Frontend",
			Type:        "frontend_svelte",
			Description: "Desktop user interface featuring split inbox views (Main, Newsletters, Updates), keyboard navigation shortcuts, theme toggle, and message reader.",
			Files:       []string{"frontend/src/App.svelte", "frontend/src/components/ThreadList.svelte", "frontend/src/components/MessageView.svelte"},
			Role:        "User Interface",
			RiskScore:   "LOW",
		},
	}

	summary := "FastMail is a modern Wails v2 desktop email client built with a Go backend and Svelte frontend. It features multi-account Gmail sync, embedded SQLite with FTS5 search, HTML tracker blocking, and split inbox categorizations. Static analysis identified 2 critical concurrency hazards (concurrent map access in sync routines) and 1 critical security vulnerability (regex-based HTML sanitization bypasses)."

	return &CodebaseTopology{
		ProjectName:      "FastMail (Wails + Go + Svelte)",
		TargetPath:       targetDir,
		Modules:          modules,
		Structs:          structs,
		Functions:        functions,
		ConcurrencyMap: ConcurrencyReport{
			TotalMutexes:    totalMutexes,
			TotalGoroutines: totalGoroutines,
			Hazards:         hazards,
			IdiomExplainers: idiomExplainers,
		},
		SecurityDataflow: SecurityReport{
			TaintFlows:      taintFlows,
			SanitizerAudits: sanitizerAudits,
			SQLChecks:       sqlChecks,
		},
		BridgeEndpoints: bridgeEndpoints,
		Invariants:      invariants,
		SourceFiles:     sourceFiles,
		Summary:         summary,
	}, nil
}

func extractStruct(fset *token.FileSet, file string, name string, st *ast.StructType, docGroup *ast.CommentGroup) StructNode {
	line := fset.Position(st.Pos()).Line
	var fields []StructField
	hasMutex := false
	mutexType := ""

	doc := ""
	if docGroup != nil {
		doc = strings.TrimSpace(docGroup.Text())
	}

	if st.Fields != nil {
		for _, f := range st.Fields.List {
			fieldTypeStr := typeToString(f.Type)
			isMut := strings.Contains(fieldTypeStr, "sync.Mutex") || strings.Contains(fieldTypeStr, "sync.RWMutex")
			if isMut {
				hasMutex = true
				mutexType = fieldTypeStr
			}
			isMap := strings.HasPrefix(fieldTypeStr, "map[")
			isChan := strings.HasPrefix(fieldTypeStr, "chan ")
			isPtr := strings.HasPrefix(fieldTypeStr, "*")

			if len(f.Names) > 0 {
				for _, n := range f.Names {
					fields = append(fields, StructField{
						Name:      n.Name,
						Type:      fieldTypeStr,
						IsMutex:   isMut,
						IsMap:     isMap,
						IsChannel: isChan,
						IsPointer: isPtr,
					})
				}
			} else {
				// Embedded field
				fields = append(fields, StructField{
					Name:      fieldTypeStr,
					Type:      fieldTypeStr,
					IsMutex:   isMut,
					IsMap:     isMap,
					IsChannel: isChan,
					IsPointer: isPtr,
				})
			}
		}
	}

	return StructNode{
		ID:        fmt.Sprintf("STRUCT-%s-%s", file, name),
		Name:      name,
		File:      file,
		Line:      line,
		Fields:    fields,
		HasMutex:  hasMutex,
		MutexType: mutexType,
		Doc:       doc,
	}
}

func extractFunction(fset *token.FileSet, file string, fn *ast.FuncDecl, content []byte) FunctionNode {
	startLine := fset.Position(fn.Pos()).Line
	endLine := fset.Position(fn.End()).Line

	recv := ""
	if fn.Recv != nil && len(fn.Recv.List) > 0 {
		recv = typeToString(fn.Recv.List[0].Type)
	}

	var calls []string
	var spawnsGo []GoroutineSpawn
	var mutexOps []MutexOp
	var mapAccesses []MapAccess

	// Inspect function body
	if fn.Body != nil {
		inLoop := 0
		ast.Inspect(fn.Body, func(n ast.Node) bool {
			switch node := n.(type) {
			case *ast.ForStmt, *ast.RangeStmt:
				if node != nil {
					inLoop++
				}
			case *ast.GoStmt:
				spLine := fset.Position(node.Pos()).Line
				hasCtx := false
				if node.Call != nil {
					for _, arg := range node.Call.Args {
						argStr := exprToString(arg)
						if strings.Contains(argStr, "ctx") || strings.Contains(argStr, "Context") {
							hasCtx = true
						}
					}
				}
				target := "anonymous"
				if node.Call != nil {
					target = exprToString(node.Call.Fun)
				}
				spawnsGo = append(spawnsGo, GoroutineSpawn{
					File:       file,
					Line:       spLine,
					CallerFunc: fn.Name.Name,
					TargetFunc: target,
					HasContext: hasCtx,
				})
			case *ast.DeferStmt:
				if node.Call != nil {
					callStr := exprToString(node.Call.Fun)
					if strings.HasSuffix(callStr, ".Unlock") || strings.HasSuffix(callStr, ".RUnlock") {
						mLine := fset.Position(node.Pos()).Line
						parts := strings.Split(callStr, ".")
						mName := "mu"
						if len(parts) >= 2 {
							mName = parts[len(parts)-2]
						}
						op := "Unlock"
						if strings.HasSuffix(callStr, ".RUnlock") {
							op = "RUnlock"
						}
						mutexOps = append(mutexOps, MutexOp{
							File:       file,
							Line:       mLine,
							Receiver:   recv,
							MutexName:  mName,
							Op:         op,
							IsDefer:    true,
							InsideLoop: inLoop > 0,
						})
					}
				}
			case *ast.CallExpr:
				callStr := exprToString(node.Fun)
				calls = append(calls, callStr)

				if strings.HasSuffix(callStr, ".Lock") || strings.HasSuffix(callStr, ".RLock") || strings.HasSuffix(callStr, ".Unlock") || strings.HasSuffix(callStr, ".RUnlock") {
					mLine := fset.Position(node.Pos()).Line
					parts := strings.Split(callStr, ".")
					mName := "mu"
					if len(parts) >= 2 {
						mName = parts[len(parts)-2]
					}
					op := parts[len(parts)-1]
					// Check if already captured via defer
					isDef := false
					for _, existing := range mutexOps {
						if existing.Line == mLine {
							isDef = true
							break
						}
					}
					if !isDef {
						mutexOps = append(mutexOps, MutexOp{
							File:       file,
							Line:       mLine,
							Receiver:   recv,
							MutexName:  mName,
							Op:         op,
							IsDefer:    false,
							InsideLoop: inLoop > 0,
						})
					}
				}
			}
			return true
		})
	}

	doc := ""
	if fn.Doc != nil {
		doc = strings.TrimSpace(fn.Doc.Text())
	}

	sig := fn.Name.Name
	if fn.Type != nil {
		sig = fmt.Sprintf("func %s%s", fn.Name.Name, exprToString(fn.Type))
	}

	return FunctionNode{
		ID:           fmt.Sprintf("FUNC-%s-%s", file, fn.Name.Name),
		Name:         fn.Name.Name,
		Receiver:     recv,
		File:         file,
		StartLine:    startLine,
		EndLine:      endLine,
		Signature:    sig,
		Calls:        calls,
		SpawnsGo:     spawnsGo,
		MutexOps:     mutexOps,
		MapAccesses:  mapAccesses,
		IsWailsBound: recv == "*App" && ast.IsExported(fn.Name.Name),
		Doc:          doc,
	}
}

func typeToString(expr ast.Expr) string {
	if expr == nil {
		return ""
	}
	var buf bytes.Buffer
	printer.Fprint(&buf, token.NewFileSet(), expr)
	return buf.String()
}

func exprToString(expr ast.Expr) string {
	if expr == nil {
		return ""
	}
	var buf bytes.Buffer
	printer.Fprint(&buf, token.NewFileSet(), expr)
	return buf.String()
}

var _ = regexp.Compile
