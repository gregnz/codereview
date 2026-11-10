package analyzer

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAnalyzeProjectUsesTargetMetadata(t *testing.T) {
	target := filepath.Join(t.TempDir(), "sample-service")
	if err := os.MkdirAll(target, 0755); err != nil {
		t.Fatal(err)
	}
	source := strings.Join([]string{
		"package service",
		"func Run() {}",
	}, string([]byte{10}))
	if err := os.WriteFile(filepath.Join(target, "main.go"), []byte(source), 0644); err != nil {
		t.Fatal(err)
	}

	topology, err := AnalyzeProject(target)
	if err != nil {
		t.Fatal(err)
	}
	if topology.ProjectName != "sample-service" {
		t.Fatalf("project name = %q, want target directory name", topology.ProjectName)
	}
	if topology.Runtime != "go" {
		t.Fatalf("runtime = %q, want go", topology.Runtime)
	}
	if strings.Contains(topology.Summary, "FastMail") {
		t.Fatalf("summary contains demo project identity: %q", topology.Summary)
	}
	if len(topology.Modules) != 1 || topology.Modules[0].Name != "service" {
		t.Fatalf("modules were not derived from source package: %+v", topology.Modules)
	}
	if len(topology.SecurityDataflow.TaintFlows) != 0 || len(topology.SecurityDataflow.SanitizerAudits) != 0 {
		t.Fatalf("security report contains unverified canned results: %+v", topology.SecurityDataflow)
	}
	if len(topology.Invariants) != 0 {
		t.Fatalf("invariants contain unverified canned results: %+v", topology.Invariants)
	}
}

func TestGenerateScenariosDoesNotEmitDemoWorkflow(t *testing.T) {
	bundle := GenerateScenarios()
	if len(bundle.Scenarios) != 0 {
		t.Fatalf("default scenario generation returned %d canned scenarios", len(bundle.Scenarios))
	}
}
