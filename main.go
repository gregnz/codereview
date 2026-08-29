package main

import (
	"codereview/analyzer"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func main() {
	targetDir := "/Users/gregday/projects/mail"
	if len(os.Args) > 1 {
		targetDir = os.Args[1]
	}

	fmt.Printf("🔍 Scanning target codebase: %s\n", targetDir)

	// Run AST & Concurrency Extractor
	topology, err := analyzer.AnalyzeProject(targetDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error analyzing project: %v\n", err)
		os.Exit(1)
	}

	topologyJSON, err := json.MarshalIndent(topology, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error encoding topology: %v\n", err)
		os.Exit(1)
	}
	_ = os.WriteFile("topology.json", topologyJSON, 0644)

	// Generate Scenarios
	scenarios := analyzer.GenerateScenarios()
	scenariosJSON, err := json.MarshalIndent(scenarios, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error encoding scenarios: %v\n", err)
		os.Exit(1)
	}
	_ = os.WriteFile("scenarios.json", scenariosJSON, 0644)

	// Build workbench.html from template.html
	templateBytes, err := os.ReadFile("template.html")
	if err == nil {
		genesisBytes, _ := os.ReadFile("genesis_story.json")
		output := strings.ReplaceAll(string(templateBytes), "__TOPOLOGY__", string(topologyJSON))
		output = strings.ReplaceAll(output, "__GENESIS__", string(genesisBytes))
		output = strings.ReplaceAll(output, "__SCENARIOS__", string(scenariosJSON))

		dotnetBytes, _ := os.ReadFile("fixtures/dotnet_oracle.json")
		javaBytes, _ := os.ReadFile("fixtures/java_postgres.json")
		pythonBytes, _ := os.ReadFile("fixtures/python_sqlite.json")

		output = strings.ReplaceAll(output, "__DOTNET__", string(dotnetBytes))
		output = strings.ReplaceAll(output, "__JAVA__", string(javaBytes))
		output = strings.ReplaceAll(output, "__PYTHON__", string(pythonBytes))

		_ = os.WriteFile("workbench.html", []byte(output), 0644)
		_ = os.WriteFile("index.html", []byte(output), 0644)
	}

	port := 8088
	url := fmt.Sprintf("http://localhost:%d/workbench.html", port)
	fmt.Printf("✨ AST Analysis complete (%d structs, %d functions, %d hazards)\n",
		len(topology.Structs), len(topology.Functions), len(topology.ConcurrencyMap.Hazards))
	fmt.Printf("⚡ Codebase Verification Workbench ready at: %s\n", url)

	// Start local HTTP server
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" || path == "/workbench" {
			path = "/workbench.html"
		}
		filePath := filepath.Join(".", path)
		http.ServeFile(w, r, filePath)
	})

	go func() {
		openBrowser(url)
	}()

	fmt.Println("🚀 Serving workbench... Press Ctrl+C to stop.")
	if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err != nil {
		fmt.Printf("Server stopped: %v\n", err)
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	}
	if cmd != nil {
		_ = cmd.Start()
	}
}
