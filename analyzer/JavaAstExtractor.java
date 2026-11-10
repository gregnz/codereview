import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.MethodInvocationTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.VariableTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.SourcePositions;
import com.sun.source.util.TreeScanner;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.Trees;
import javax.lang.model.element.Modifier;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

public final class JavaAstExtractor {
    private static final Set<String> SKIPPED_DIRECTORIES = Set.of(
        ".git", ".gradle", ".idea", "build", "dist", "ecrs-lib", "lib",
        "node_modules", "target", "vendor"
    );

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage: JavaAstExtractor.java <source-root>");
            System.exit(2);
        }
        Path root = Paths.get(args[0]).toAbsolutePath().normalize();
        List<Path> files = collectSources(root);
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            System.err.println("A full JDK is required for Java analysis.");
            System.exit(2);
        }

        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8)) {
            Iterable<? extends JavaFileObject> units = fileManager.getJavaFileObjectsFromPaths(files);
            JavacTask task = (JavacTask) compiler.getTask(null, fileManager, diagnostics, List.of("-proc:none"), null, units);
            Trees trees = Trees.instance(task);
            SourcePositions positions = trees.getSourcePositions();
            for (CompilationUnitTree unit : task.parse()) {
                String packageName = unit.getPackageName() == null ? "" : unit.getPackageName().toString();
                Path sourcePath = Paths.get(unit.getSourceFile().toUri());
                String relativeFile = root.relativize(sourcePath).toString().replace('\\', '/');
                        new TreeScanner<Void, Void>() {
                    private final Deque<String> classNames = new ArrayDeque<>();

                    @Override
                    public Void visitClass(ClassTree node, Void unused) {
                        String simpleName = node.getSimpleName().toString();
                        if (simpleName.isEmpty()) {
                            return super.visitClass(node, unused);
                        }
                        classNames.addLast(simpleName);
                        String className = String.join(".", classNames);
                        long classPosition = positions.getStartPosition(unit, node);
                        long classLine = unit.getLineMap().getLineNumber(classPosition);
                        boolean hasSynchronizedMethod = node.getMembers().stream()
                            .filter(member -> member instanceof MethodTree)
                            .map(member -> (MethodTree) member)
                            .anyMatch(method -> method.getModifiers().getFlags().contains(Modifier.SYNCHRONIZED));
                        emit("C", encode(packageName), encode(relativeFile), encode(className), encode(simpleName),
                            encode(node.getKind().name().toLowerCase(Locale.ROOT)), Long.toString(classLine),
                            Boolean.toString(hasSynchronizedMethod));

                        for (Tree member : node.getMembers()) {
                            if (member instanceof VariableTree) {
                                VariableTree field = (VariableTree) member;
                                String type = field.getType() == null ? "" : field.getType().toString();
                                String loweredType = type.toLowerCase(Locale.ROOT);
                                boolean isMutex = loweredType.contains("lock") || loweredType.contains("semaphore");
                                boolean isMap = loweredType.contains("map<") || loweredType.contains("hashmap<")
                                    || loweredType.contains("treemap<") || loweredType.contains("concurrentmap<");
                                long fieldLine = unit.getLineMap().getLineNumber(positions.getStartPosition(unit, field));
                                emit("F", encode(relativeFile), encode(className), encode(field.getName().toString()),
                                    encode(type), Long.toString(fieldLine), Boolean.toString(isMutex), Boolean.toString(isMap));
                            } else if (member instanceof MethodTree) {
                                emitMethod((MethodTree) member, className, unit, positions);
                            }
                        }
                        Void result = super.visitClass(node, unused);
                        classNames.removeLast();
                        return result;
                    }

                    private void emitMethod(MethodTree method, String className, CompilationUnitTree unit, SourcePositions positions) {
                        long start = positions.getStartPosition(unit, method);
                        long end = positions.getEndPosition(unit, method);
                        long startLine = unit.getLineMap().getLineNumber(start);
                        long endLine = unit.getLineMap().getLineNumber(Math.max(start, end - 1));
                        String name = method.getName().toString();
                        if (name.equals("<init>")) {
                            name = classNames.peekLast();
                        }
                        String signature = method.getModifiers().toString();
                        if (method.getReturnType() != null) {
                            signature += " " + method.getReturnType();
                        }
                        signature += " " + name + "(" + method.getParameters().stream()
                            .map(parameter -> parameter.getType() + " " + parameter.getName())
                            .collect(Collectors.joining(", ")) + ")";
                        if (!method.getThrows().isEmpty()) {
                            signature += " throws " + method.getThrows().stream().map(Object::toString).collect(Collectors.joining(", "));
                        }
                        List<String> calls = new ArrayList<>();
                        List<String> lockOps = new ArrayList<>();
                        new TreeScanner<Void, Void>() {
                            @Override
                            public Void visitMethodInvocation(MethodInvocationTree invocation, Void unused) {
                                String call = invocation.getMethodSelect().toString();
                                calls.add(call);
                                for (String operation : List.of("lock", "unlock")) {
                                    if (call.endsWith("." + operation)) {
                                        String mutexName = call.substring(0, call.length() - operation.length() - 1);
                                        long callLine = unit.getLineMap().getLineNumber(positions.getStartPosition(unit, invocation));
                                        lockOps.add(mutexName + "\u001e" + operation + "\u001e" + callLine);
                                    }
                                }
                                return super.visitMethodInvocation(invocation, unused);
                            }
                        }.scan(method.getBody(), null);
                        boolean synchronizedMethod = method.getModifiers().getFlags().contains(Modifier.SYNCHRONIZED);
                        emit("M", encode(relativeFile), encode(className), encode(name), Long.toString(startLine),
                            Long.toString(endLine), encode(signature), Boolean.toString(synchronizedMethod),
                            encode(String.join("\u001f", calls)), encode(String.join("\u001f", lockOps)));
                    }
                }.scan(unit, null);
            }
        }
    }

    private static List<Path> collectSources(Path root) throws IOException {
        List<Path> files = new ArrayList<>();
        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path directory, BasicFileAttributes attributes) {
                if (!directory.equals(root) && SKIPPED_DIRECTORIES.contains(directory.getFileName().toString().toLowerCase(Locale.ROOT))) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) {
                if (file.getFileName().toString().endsWith(".java")) {
                    files.add(file);
                }
                return FileVisitResult.CONTINUE;
            }
        });
        files.sort(Comparator.comparing(Path::toString));
        return files;
    }

    private static String encode(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static void emit(String... fields) {
        System.out.println(String.join("\t", fields));
    }
}