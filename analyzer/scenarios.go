package analyzer

type ScenarioStep struct {
	StepIndex        int               `json:"stepIndex"`
	Title            string            `json:"title"`
	Description      string            `json:"description"`
	ActiveModuleId   string            `json:"activeModuleId"`
	ActiveNodeId     string            `json:"activeNodeId"`
	File             string            `json:"file"`
	Line             int               `json:"line"`
	CallStack        []string          `json:"callStack"`
	MutexStates      map[string]string `json:"mutexStates"` // "UNLOCKED", "LOCKED_EXCLUSIVE", "LOCKED_SHARED"
	ActiveGoroutines int               `json:"activeGoroutines"`
	StateMutations   map[string]string `json:"stateMutations"`
	HazardAlert      string            `json:"hazardAlert,omitempty"`
	Explanation      string            `json:"explanation"`
}

type Scenario struct {
	ID          string         `json:"id"`
	Title       string         `json:"title"`
	Category    string         `json:"category"` // "CONCURRENCY", "SECURITY", "DATA_INTEGRITY", "FULL_STACK"
	Description string         `json:"description"`
	Steps       []ScenarioStep `json:"steps"`
}

type ScenarioBundle struct {
	Scenarios []Scenario `json:"scenarios"`
}

func GenerateScenarios() ScenarioBundle {
	return ScenarioBundle{
		Scenarios: []Scenario{
			{
				ID:          "SCEN-SYNC",
				Title:       "Mailbox Sync & Ingestion Pipeline",
				Category:    "FULL_STACK",
				Description: "Step-by-step verification of an incoming email sync: from frontend trigger to Google API fetch, HTML sanitization, SQLite persistence, and UI event notification.",
				Steps: []ScenarioStep{
					{
						StepIndex:        1,
						Title:            "Frontend Trigger",
						Description:      "User clicks 'Sync Mailbox' or automated interval triggers in Svelte UI.",
						ActiveModuleId:   "MOD-FRONTEND",
						ActiveNodeId:     "FUNC-App.svelte-triggerSync",
						File:             "frontend/src/App.svelte",
						Line:             48,
						CallStack:        []string{"App.svelte:triggerSync()", "window.go.main.App.SyncMailbox()"},
						MutexStates:      map[string]string{"App.syncMu": "UNLOCKED", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 1,
						StateMutations:   map[string]string{"frontend.syncing": "true"},
						Explanation:      "Wails IPC serializes the request into a JSON-RPC message over webview IPC.",
					},
					{
						StepIndex:        2,
						Title:            "IPC Dispatch & Mutex Check",
						Description:      "Backend `App.SyncMailbox` executes, acquiring `syncMu` to prevent duplicate parallel syncs.",
						ActiveModuleId:   "MOD-APP",
						ActiveNodeId:     "FUNC-app.go-SyncMailbox",
						File:             "app.go",
						Line:             95,
						CallStack:        []string{"main.(*App).SyncMailbox()"},
						MutexStates:      map[string]string{"App.syncMu": "LOCKED_EXCLUSIVE", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 1,
						StateMutations:   map[string]string{"a.syncingAccounts[\"user@fastmail.com\"]": "true"},
						Explanation:      "`syncMu.Lock()` ensures only one sync job runs per account, preventing database lock contention.",
					},
					{
						StepIndex:        3,
						Title:            "Background Goroutine Spawn",
						Description:      "`SyncEngine.SyncMailbox` is launched in a background goroutine.",
						ActiveModuleId:   "MOD-SYNC",
						ActiveNodeId:     "FUNC-sync.go-SyncMailbox",
						File:             "sync.go",
						Line:             45,
						CallStack:        []string{"go main.(*SyncEngine).SyncMailbox()"},
						MutexStates:      map[string]string{"App.syncMu": "UNLOCKED", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 2,
						StateMutations:   map[string]string{"syncEngine.status": "\"FETCHING_GMAIL_HISTORY\""},
						Explanation:      "Goroutine runs asynchronously so the desktop UI remains responsive at 60fps.",
					},
					{
						StepIndex:        4,
						Title:            "HTML Sanitizer & Tracker Strip",
						Description:      "Raw MIME body is processed by `SanitizeEmailHTML` to strip 1x1 tracking pixels and dangerous scripts.",
						ActiveModuleId:   "MOD-SANITIZER",
						ActiveNodeId:     "FUNC-sanitizer.go-SanitizeEmailHTML",
						File:             "sanitizer.go",
						Line:             52,
						CallStack:        []string{"main.(*SyncEngine).SyncMailbox()", "main.SanitizeEmailHTML()"},
						MutexStates:      map[string]string{"App.syncMu": "UNLOCKED", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 2,
						StateMutations:   map[string]string{"sanitizer.trackersBlocked": "2", "cleanHTML": "\"<p>Meeting confirmation...</p>\""},
						HazardAlert:      "⚠️ Regex Sanitizer Warning: Complex nested markup can bypass regex filters.",
						Explanation:      "Email tracking pixels from SendGrid and HubSpot are removed before writing to disk.",
					},
					{
						StepIndex:        5,
						Title:            "SQLite Parameterized Insert",
						Description:      "Clean message is inserted into SQLite messages table with FTS5 index update.",
						ActiveModuleId:   "MOD-STORE",
						ActiveNodeId:     "FUNC-store.go-InsertMessage",
						File:             "store.go",
						Line:             185,
						CallStack:        []string{"main.(*SyncEngine).SyncMailbox()", "main.(*LocalStore).InsertMessage()"},
						MutexStates:      map[string]string{"App.syncMu": "UNLOCKED", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 2,
						StateMutations:   map[string]string{"sqlite.messages_count": "+1", "sqlite.fts_indexed": "true"},
						Explanation:      "All values bound with parameterized `?` placeholders, preventing SQL injection.",
					},
					{
						StepIndex:        6,
						Title:            "Wails Event Notification",
						Description:      "`wailsRuntime.EventsEmit(ctx, \"sync:progress\", progress)` notifies Svelte frontend.",
						ActiveModuleId:   "MOD-APP",
						ActiveNodeId:     "FUNC-app.go-EventsEmit",
						File:             "app.go",
						Line:             142,
						CallStack:        []string{"main.(*App).EmitSyncUpdate()"},
						MutexStates:      map[string]string{"App.syncMu": "UNLOCKED", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 1,
						StateMutations:   map[string]string{"frontend.threadsList": "updated (1 new thread)"},
						Explanation:      "Svelte store receives the event reactively and updates the inbox list with zero DOM flicker.",
					},
				},
			},
			{
				ID:          "SCEN-SECURITY",
				Title:       "Malicious HTML Email & Sanitizer Bypass Audit",
				Category:    "SECURITY",
				Description: "Audits how the sanitizer handles malicious HTML containing obfuscated XSS payloads and tracker pixels.",
				Steps: []ScenarioStep{
					{
						StepIndex:        1,
						Title:            "Untrusted Ingestion",
						Description:      "Incoming email arrives containing tracking pixel `<img src='https://sendgrid.net/wf/open?upn=...' width='1' height='1'>` and nested `<scr<script>ipt>` tag.",
						ActiveModuleId:   "MOD-SYNC",
						ActiveNodeId:     "FUNC-sync.go-FetchMessage",
						File:             "sync.go",
						Line:             110,
						CallStack:        []string{"main.(*SyncEngine).FetchMessage()"},
						MutexStates:      map[string]string{},
						ActiveGoroutines: 1,
						StateMutations:   map[string]string{"rawBody": "\"<img src='...' width='1'/><scr<script>ipt>alert(1)</script>\""},
						Explanation:      "Untrusted MIME body from internet payload enters system.",
					},
					{
						StepIndex:        2,
						Title:            "Regex Tracker Filter",
						Description:      "`imgTagRegex` detects 1x1 image and replaces with placeholder.",
						ActiveModuleId:   "MOD-SANITIZER",
						ActiveNodeId:     "FUNC-sanitizer.go-SanitizeEmailHTML",
						File:             "sanitizer.go",
						Line:             65,
						CallStack:        []string{"main.SanitizeEmailHTML()"},
						MutexStates:      map[string]string{},
						ActiveGoroutines: 1,
						StateMutations:   map[string]string{"trackersBlocked": "1"},
						Explanation:      "Tracking pixel pattern matched against known ESP domains.",
					},
					{
						StepIndex:        3,
						Title:            "Nested Script Tag Bypass Check",
						Description:      "Evaluating regex single-pass script removal against `<scr<script>ipt>`.",
						ActiveModuleId:   "MOD-SANITIZER",
						ActiveNodeId:     "FUNC-sanitizer.go-SanitizeEmailHTML",
						File:             "sanitizer.go",
						Line:             88,
						CallStack:        []string{"main.SanitizeEmailHTML()"},
						MutexStates:      map[string]string{},
						ActiveGoroutines: 1,
						StateMutations:   map[string]string{"residualScript": "\"<script>alert(1)</script>\""},
						HazardAlert:      "🚨 CRITICAL SECURITY VULNERABILITY: Single-pass regex stripping leaves inner `<script>` intact after outer tag is removed.",
						Explanation:      "In regex: `strings.ReplaceAll(s, '<script>', '')` converts `<scr<script>ipt>` into `<script>`. A proper AST tokenizer must be used.",
					},
				},
			},
			{
				ID:          "SCEN-CONCURRENCY",
				Title:       "Concurrent Multi-Account Switching & Map Race",
				Category:    "CONCURRENCY",
				Description: "Simulates parallel goroutines performing account switching while background sync is writing to shared maps.",
				Steps: []ScenarioStep{
					{
						StepIndex:        1,
						Title:            "Background Sync Active",
						Description:      "Goroutine #1 is syncing Account A and executing `a.clients[\"a@domain.com\"] = service`.",
						ActiveModuleId:   "MOD-SYNC",
						ActiveNodeId:     "FUNC-sync.go-RunSync",
						File:             "sync.go",
						Line:             80,
						CallStack:        []string{"main.(*SyncEngine).RunSync()"},
						MutexStates:      map[string]string{"App.syncMu": "UNLOCKED", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 2,
						StateMutations:   map[string]string{"a.clients[\"a@domain.com\"]": "writing"},
						HazardAlert:      "⚠️ Unlocked Map Access in Goroutine #1",
						Explanation:      "Goroutine writes to map without holding `syncMu` or `mu`.",
					},
					{
						StepIndex:        2,
						Title:            "User Clicks Switch Account",
						Description:      "Main thread receives UI click and calls `App.GetAccounts()` which reads `len(a.clients)`.",
						ActiveModuleId:   "MOD-APP",
						ActiveNodeId:     "FUNC-app.go-GetAccounts",
						File:             "app.go",
						Line:             115,
						CallStack:        []string{"main.(*App).GetAccounts()"},
						MutexStates:      map[string]string{"App.syncMu": "UNLOCKED", "App.mu": "UNLOCKED"},
						ActiveGoroutines: 2,
						StateMutations:   map[string]string{"a.clients": "reading during write"},
						HazardAlert:      "💥 FATAL RUNTIME PANIC: `fatal error: concurrent map read and map write`",
						Explanation:      "Go runtime detects concurrent map access without synchronization and crashes the entire application process immediately.",
					},
				},
			},
		},
	}
}


