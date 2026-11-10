package analyzer

import (
	"bufio"
	_ "embed"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

//go:embed JavaAstExtractor.java
var javaAstExtractor string

type javaClassRecord struct {
	Package string
	File    string
	Name    string
	Simple  string
	Kind    string
	Line    int
	HasLock bool
}

type javaFieldRecord struct {
	File    string
	Class   string
	Name    string
	Type    string
	Line    int
	IsMutex bool
	IsMap   bool
}

func collectJavaFiles(targetDir string) ([]string, error) {
	var files []string
	skipDirs := map[string]bool{
		".git": true, ".gradle": true, ".idea": true, "build": true,
		"dist": true, "ecrs-lib": true, "lib": true, "node_modules": true,
		"target": true, "vendor": true,
	}
	err := filepath.WalkDir(targetDir, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if path != targetDir && skipDirs[strings.ToLower(entry.Name())] {
				return filepath.SkipDir
			}
			return nil
		}
		if strings.EqualFold(filepath.Ext(path), ".java") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	return files, nil
}

func analyzeJavaProject(targetDir string, javaFiles []string) (*CodebaseTopology, error) {
	tempDir, err := os.MkdirTemp("", "codereview-java-")
	if err != nil {
		return nil, fmt.Errorf("create Java parser workspace: %w", err)
	}
	defer os.RemoveAll(tempDir)

	helperPath := filepath.Join(tempDir, "JavaAstExtractor.java")
	if err := os.WriteFile(helperPath, []byte(javaAstExtractor), 0600); err != nil {
		return nil, fmt.Errorf("write Java parser: %w", err)
	}
	command := exec.Command("java", helperPath, targetDir)
	output, err := command.Output()
	if err != nil {
		if _, lookupErr := exec.LookPath("java"); lookupErr != nil {
			return nil, fmt.Errorf("Java analysis requires a Java 11+ runtime: %w", lookupErr)
		}
		if exitErr, ok := err.(*exec.ExitError); ok && len(exitErr.Stderr) > 0 {
			return nil, fmt.Errorf("run Java syntax-tree extractor: %s", strings.TrimSpace(string(exitErr.Stderr)))
		}
		return nil, fmt.Errorf("run Java syntax-tree extractor: %w", err)
	}

	classes := map[string]javaClassRecord{}
	var classOrder []string
	fieldsByClass := map[string][]StructField{}
	methodsByClass := map[string][]string{}
	var functions []FunctionNode
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	scanner.Buffer(make([]byte, 64*1024), 16*1024*1024)
	for scanner.Scan() {
		parts := strings.Split(scanner.Text(), "\t")
		if len(parts) == 0 {
			continue
		}
		decode := func(index int) string {
			value, decodeErr := base64.StdEncoding.DecodeString(parts[index])
			if decodeErr != nil {
				return ""
			}
			return string(value)
		}
		lineNumber := func(index int) int {
			value, parseErr := strconv.Atoi(parts[index])
			if parseErr != nil {
				return 0
			}
			return value
		}
		switch parts[0] {
		case "C":
			if len(parts) != 8 {
				continue
			}
			class := javaClassRecord{
				Package: decode(1), File: decode(2), Name: decode(3), Simple: decode(4),
				Kind: decode(5), Line: lineNumber(6), HasLock: parts[7] == "true",
			}
			key := class.File + "\x00" + class.Name
			classes[key] = class
			classOrder = append(classOrder, key)
		case "F":
			if len(parts) != 8 {
				continue
			}
			file, className := decode(1), decode(2)
			key := file + "\x00" + className
			fieldsByClass[key] = append(fieldsByClass[key], StructField{
				Name: decode(3), Type: decode(4), IsMutex: parts[6] == "true",
				IsMap: parts[7] == "true",
			})
		case "M":
			if len(parts) != 10 {
				continue
			}
			file, className, name := decode(1), decode(2), decode(3)
			startLine, endLine := lineNumber(4), lineNumber(5)
			callsText := decode(8)
			var calls []string
			if callsText != "" {
				calls = strings.Split(callsText, "\x1f")
			}
			var mutexOps []MutexOp
			for _, lockOp := range strings.Split(decode(9), "\x1f") {
				opParts := strings.Split(lockOp, "\x1e")
				if len(opParts) != 3 {
					continue
				}
				opLine, err := strconv.Atoi(opParts[2])
				if err != nil {
					continue
				}
				operation := "Lock"
				if opParts[1] == "unlock" {
					operation = "Unlock"
				}
				mutexOps = append(mutexOps, MutexOp{
					File: file, Line: opLine, Receiver: className,
					MutexName: opParts[0], Op: operation,
				})
			}
			methodsByClass[file+"\x00"+className] = append(methodsByClass[file+"\x00"+className], name)
			doc := ""
			if parts[7] == "true" {
				doc = "synchronized method"
			}
			functions = append(functions, FunctionNode{
				ID:   fmt.Sprintf("FUNC-%s-%s-%d", file, name, startLine),
				Name: name, Receiver: className, File: file, StartLine: startLine,
				EndLine: endLine, Signature: decode(6), Calls: calls,
				MutexOps: mutexOps, MapAccesses: []MapAccess{},
				SpawnsGo: []GoroutineSpawn{},
				Doc:      doc,
			})
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read Java syntax-tree output: %w", err)
	}

	sourceFiles := make(map[string]string, len(javaFiles))
	for _, file := range javaFiles {
		relative, err := filepath.Rel(targetDir, file)
		if err != nil {
			continue
		}
		content, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		sourceFiles[filepath.ToSlash(relative)] = string(content)
	}

	structs := make([]StructNode, 0, len(classOrder))
	modulesByPackage := map[string]*ModuleNode{}
	var moduleOrder []string
	totalMutexes := 0
	for _, key := range classOrder {
		class := classes[key]
		fields := fieldsByClass[key]
		hasMutex := class.HasLock
		mutexType := ""
		for _, field := range fields {
			if field.IsMutex {
				hasMutex = true
				mutexType = field.Type
				totalMutexes++
			}
		}
		if hasMutex && mutexType == "" {
			mutexType = "synchronized"
		}
		structs = append(structs, StructNode{
			ID:   fmt.Sprintf("CLASS-%s-%s", class.File, class.Name),
			Name: class.Simple, File: class.File, Line: class.Line,
			Fields: fields, HasMutex: hasMutex, MutexType: mutexType,
			Methods: methodsByClass[key], Doc: class.Kind,
		})

		packageName := class.Package
		if packageName == "" {
			packageName = "(default package)"
		}
		module := modulesByPackage[packageName]
		if module == nil {
			module = &ModuleNode{
				ID:   "MOD-JAVA-" + strings.NewReplacer(".", "-", " ", "-").Replace(packageName),
				Name: packageName, Type: "backend_java",
				Description: "Java package extracted from syntax trees.",
				Files:       []string{}, Role: "Java package", RiskScore: "MEDIUM",
			}
			modulesByPackage[packageName] = module
			moduleOrder = append(moduleOrder, packageName)
		}
		if !containsString(module.Files, class.File) {
			module.Files = append(module.Files, class.File)
		}
	}
	modules := make([]ModuleNode, 0, len(moduleOrder))
	for _, packageName := range moduleOrder {
		modules = append(modules, *modulesByPackage[packageName])
	}

	return &CodebaseTopology{
		ProjectName: filepath.Base(filepath.Clean(targetDir)),
		TargetPath:  targetDir,
		Runtime:     "java",
		Modules:     modules,
		Structs:     structs,
		Functions:   functions,
		ConcurrencyMap: ConcurrencyReport{
			TotalMutexes: totalMutexes, TotalGoroutines: 0,
			Hazards: []HazardWarning{}, IdiomExplainers: []IdiomExplainer{},
		},
		SecurityDataflow: SecurityReport{
			TaintFlows: []TaintFlow{}, SanitizerAudits: []SanitizerAudit{}, SQLChecks: []SQLCheck{},
		},
		BridgeEndpoints: []BridgeEndpoint{},
		Invariants:      []InvariantCheck{},
		SourceFiles:     sourceFiles,
		Summary:         fmt.Sprintf("Java syntax-tree extraction found %d source files, %d classes, and %d methods. Java-specific security and concurrency audits are not yet implemented.", len(sourceFiles), len(structs), len(functions)),
	}, nil
}

func containsString(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}
