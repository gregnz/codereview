# Pitfalls Research: AI-Generated Code Review & Verification

## Critical AI-Generated Code Pitfalls in Go & Full-Stack Apps

### 1. The Concurrency Mirage: Concurrent Map Access & Fatal Panics
- **The Problem**: AI frequently writes Go code that reads/writes standard Go maps across background goroutines without locking. Unlike languages with GIL or built-in thread safety, Go will **immediately crash with an unrecoverable runtime panic**: `fatal error: concurrent map writes`.
- **Target App Risk**: In `app.go`, `a.clients` and `a.syncingAccounts` are accessed during background sync routines. If mutex acquisition is missing in even one helper or getter, the entire app crashes.
- **Verification Rule**: Any method accessing a map must acquire the protecting mutex beforehand; verify with static AST inspection.

### 2. Regex-Based HTML Sanitization vs DOM-Parser Sanitization
- **The Problem**: AI commonly generates regular expressions to strip `<script>` tags, tracking pixels, or malicious payloads (as seen in `sanitizer.go`).
- **Security Vulnerability**: Regex cannot reliably parse irregular HTML. Attackers can bypass regex filters using nested tags (`<scr<script>ipt>`), attribute mutation (`<img src=x onerror=...`), case variations, and malformed tags, leading to Stored XSS or tracking leaks.
- **Verification Rule**: Flag regex-based HTML parsing as high-risk; compare against tokenized AST/DOM sanitizers (like `bluemonday` or `DOMPurify`).

### 3. Mutex Lock Lifecycle & Defer Misplacement
- **The Problem**:
  - Locking inside a loop without unlocking inside the iteration.
  - Early returns before `mu.Unlock()` when `defer` is omitted.
  - Copying structs containing mutexes by value (which duplicates the mutex state and leaves the copy unprotected).
- **Verification Rule**: Verify that every `mu.Lock()` is immediately followed by `defer mu.Unlock()`, and verify struct receivers are pointer receivers (`*App`, not `App`).

### 4. SQLite Locking & Concurrency in Go
- **The Problem**: SQLite only supports one active writer at a time. If multiple goroutines attempt to write concurrently without WAL (Write-Ahead Logging) mode and busy timeout configured, SQLite throws `database is locked`.
- **Verification Rule**: Check `store.go` for `_journal_mode=WAL`, `_busy_timeout=5000`, and serialized transaction handles.

### 5. Silent Goroutine Leaks
- **The Problem**: AI spawns goroutines (`go s.SyncMailbox(...)`) that block indefinitely on network I/O or channel receives if the context is canceled or connection drops.
- **Verification Rule**: Ensure every spawned goroutine takes a `context.Context` and monitors `select { case <-ctx.Done(): return }`.
