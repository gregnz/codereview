package analyzer

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestAnalyzeProjectExtractsJavaSources(t *testing.T) {
	if _, err := exec.LookPath("java"); err != nil {
		t.Skip("Java analysis requires a JDK")
	}
	target := t.TempDir()
	sourcePath := filepath.Join(target, "src", "main", "java", "example", "InventoryService.java")
	if err := os.MkdirAll(filepath.Dir(sourcePath), 0755); err != nil {
		t.Fatal(err)
	}
	source := strings.Join([]string{
		"package example;",
		"import java.util.concurrent.locks.ReentrantLock;",
		"class InventoryService {",
		"    private final ReentrantLock lock = new ReentrantLock();",
		"    private final Repository repository = new Repository();",
		"    String checkout(String sku) {",
		"        lock.lock();",
		"        try { return repository.find(sku); }",
		"        finally { lock.unlock(); }",
		"    }",
		"}",
		"class Repository { String find(String sku) { return sku; } }",
	}, string([]byte{10}))
	if err := os.WriteFile(sourcePath, []byte(source), 0644); err != nil {
		t.Fatal(err)
	}

	topology, err := AnalyzeProject(target)
	if err != nil {
		t.Fatal(err)
	}
	if topology.Runtime != "java" {
		t.Fatalf("runtime = %q, want java", topology.Runtime)
	}
	if len(topology.Structs) != 2 {
		t.Fatalf("extracted %d classes, want 2", len(topology.Structs))
	}
	var inventoryClass *StructNode
	for i := range topology.Structs {
		if topology.Structs[i].Name == "InventoryService" {
			inventoryClass = &topology.Structs[i]
			break
		}
	}
	if inventoryClass == nil {
		t.Fatal("InventoryService class was not extracted")
	}
	if !inventoryClass.HasMutex || inventoryClass.MutexType != "ReentrantLock" {
		t.Fatalf("lock metadata not extracted: %+v", inventoryClass)
	}
	if _, ok := topology.SourceFiles["src/main/java/example/InventoryService.java"]; !ok {
		t.Fatal("relative Java source was not included")
	}
	var checkout *FunctionNode
	for i := range topology.Functions {
		if topology.Functions[i].Name == "checkout" {
			checkout = &topology.Functions[i]
			break
		}
	}
	if checkout == nil || !strings.Contains(strings.Join(checkout.Calls, " "), "repository.find") {
		t.Fatalf("Java method call was not extracted: %+v", checkout)
	}
	if len(checkout.MutexOps) != 2 {
		t.Fatalf("extracted %d lock operations, want lock and unlock", len(checkout.MutexOps))
	}
}
