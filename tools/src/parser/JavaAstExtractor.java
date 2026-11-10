import com.sun.source.tree.BinaryTree;
import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.ConditionalExpressionTree;
import com.sun.source.tree.DoWhileLoopTree;
import com.sun.source.tree.EnhancedForLoopTree;
import com.sun.source.tree.ForLoopTree;
import com.sun.source.tree.IfTree;
import com.sun.source.tree.MethodInvocationTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.NewClassTree;
import com.sun.source.tree.ReturnTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.VariableTree;
import com.sun.source.tree.WhileLoopTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.SourcePositions;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.TreeScanner;
import com.sun.source.util.Trees;
import javax.lang.model.element.Modifier;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class JavaAstExtractor {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage: JavaAstExtractor.java <source-manifest>");
            System.exit(2);
        }

        Map<Path, String> displayPaths = new HashMap<>();
        List<Path> sourcePaths = new ArrayList<>();
        for (String line : java.nio.file.Files.readAllLines(Paths.get(args[0]), StandardCharsets.UTF_8)) {
            String[] fields = line.split("\\t", -1);
            if (fields.length != 2) continue;
            Path sourcePath = Paths.get(decode(fields[0])).toAbsolutePath().normalize();
            sourcePaths.add(sourcePath);
            displayPaths.put(sourcePath, decode(fields[1]));
        }

        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            System.err.println("Java source analysis requires a full JDK (Java 11+). ");
            System.exit(2);
        }

        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8)) {
            Iterable<? extends JavaFileObject> units = fileManager.getJavaFileObjectsFromPaths(sourcePaths);
            JavacTask task = (JavacTask) compiler.getTask(null, fileManager, diagnostics, List.of("-proc:none"), null, units);
            Trees trees = Trees.instance(task);
            SourcePositions positions = trees.getSourcePositions();

            for (CompilationUnitTree unit : task.parse()) {
                Path sourcePath = Paths.get(unit.getSourceFile().toUri()).toAbsolutePath().normalize();
                String relativeFile = displayPaths.get(sourcePath);
                new TreePathScanner<Void, Void>() {
                    private final Deque<String> classNames = new ArrayDeque<>();

                    @Override
                    public Void visitClass(ClassTree node, Void unused) {
                        String simpleName = node.getSimpleName().toString();
                        if (simpleName.isEmpty()) return super.visitClass(node, unused);
                        classNames.addLast(simpleName);
                        String className = String.join(".", classNames);
                        int startLine = line(unit, positions.getStartPosition(unit, node));
                        int endLine = line(unit, Math.max(positions.getStartPosition(unit, node), positions.getEndPosition(unit, node) - 1));
                        String extendsName = node.getExtendsClause() == null ? "" : node.getExtendsClause().toString();
                        emit("C", encode(relativeFile), encode(className), encode(simpleName),
                            encode(node.getKind().name().toLowerCase()), Integer.toString(startLine),
                            Integer.toString(endLine), encode(extendsName), encode(node.getModifiers().getFlags().toString()));

                        for (Tree member : node.getMembers()) {
                            if (member instanceof VariableTree) {
                                VariableTree field = (VariableTree) member;
                                String type = field.getType() == null ? "" : field.getType().toString();
                                String lowerType = type.toLowerCase();
                                int fieldLine = line(unit, positions.getStartPosition(unit, field));
                                emit("F", encode(relativeFile), encode(className), encode(field.getName().toString()),
                                    encode(type), Integer.toString(fieldLine),
                                    Boolean.toString(lowerType.contains("lock") || lowerType.contains("semaphore")),
                                    Boolean.toString(lowerType.contains("map<") || lowerType.contains("hashmap<") || lowerType.contains("treemap<")));
                            } else if (member instanceof MethodTree) {
                                emitMethod((MethodTree) member, relativeFile, className, unit, positions);
                            }
                        }

                        Void result = super.visitClass(node, unused);
                        classNames.removeLast();
                        return result;
                    }

                    private void emitMethod(MethodTree method, String file, String className, CompilationUnitTree unit, SourcePositions positions) {
                        long start = positions.getStartPosition(unit, method);
                        long end = positions.getEndPosition(unit, method);
                        int startLine = line(unit, start);
                        int endLine = line(unit, Math.max(start, end - 1));
                        String name = method.getName().toString();
                        if (name.equals("<init>")) name = classNames.peekLast();

                        String signature = method.getModifiers().getFlags().toString();
                        if (method.getReturnType() != null) signature += " " + method.getReturnType();
                        signature += " " + name + "(" + method.getParameters().stream()
                            .map(parameter -> parameter.getType() + " " + parameter.getName())
                            .collect(Collectors.joining(", ")) + ")";

                        MethodMetrics metrics = new MethodMetrics();
                        metrics.scan(method.getBody(), null);
                        List<String> calls = new ArrayList<>();
                        List<String> instantiations = new ArrayList<>();
                        List<String> lockOps = new ArrayList<>();
                        new TreeScanner<Void, Void>() {
                            @Override
                            public Void visitMethodInvocation(MethodInvocationTree invocation, Void unused) {
                                String selector = invocation.getMethodSelect().toString();
                                int callLine = line(unit, positions.getStartPosition(unit, invocation));
                                calls.add(selector + "\u001e" + callLine);
                                for (String operation : List.of("lock", "unlock")) {
                                    if (selector.endsWith("." + operation)) {
                                        String receiver = selector.substring(0, selector.length() - operation.length() - 1);
                                        lockOps.add(receiver + "\u001e" + operation + "\u001e" + callLine);
                                    }
                                }
                                return super.visitMethodInvocation(invocation, unused);
                            }

                            @Override
                            public Void visitNewClass(NewClassTree expression, Void unused) {
                                instantiations.add(expression.getIdentifier() + "\u001e" + line(unit, positions.getStartPosition(unit, expression)));
                                return super.visitNewClass(expression, unused);
                            }
                        }.scan(method.getBody(), null);

                        emit("M", encode(file), encode(className), encode(name), Integer.toString(startLine),
                            Integer.toString(endLine), encode(signature), Integer.toString(method.getParameters().size()),
                            Integer.toString(metrics.returns), Integer.toString(metrics.cyclomatic),
                            Boolean.toString(method.getModifiers().getFlags().contains(Modifier.SYNCHRONIZED)),
                            encode(String.join("\u001f", calls)), encode(String.join("\u001f", instantiations)),
                            encode(String.join("\u001f", lockOps)));
                    }
                }.scan(unit, null);
            }
        }
    }

    private static int line(CompilationUnitTree unit, long position) {
        return position < 0 ? 1 : (int) unit.getLineMap().getLineNumber(position);
    }

    private static String decode(String value) {
        return new String(Base64.getDecoder().decode(value), StandardCharsets.UTF_8);
    }

    private static String encode(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static void emit(String... fields) {
        System.out.println(String.join("\t", fields));
    }

    private static final class MethodMetrics extends TreeScanner<Void, Void> {
        private int cyclomatic = 1;
        private int returns;

        @Override public Void visitIf(IfTree node, Void unused) { cyclomatic++; return super.visitIf(node, unused); }
        @Override public Void visitForLoop(ForLoopTree node, Void unused) { cyclomatic++; return super.visitForLoop(node, unused); }
        @Override public Void visitEnhancedForLoop(EnhancedForLoopTree node, Void unused) { cyclomatic++; return super.visitEnhancedForLoop(node, unused); }
        @Override public Void visitWhileLoop(WhileLoopTree node, Void unused) { cyclomatic++; return super.visitWhileLoop(node, unused); }
        @Override public Void visitDoWhileLoop(DoWhileLoopTree node, Void unused) { cyclomatic++; return super.visitDoWhileLoop(node, unused); }
        @Override public Void visitConditionalExpression(ConditionalExpressionTree node, Void unused) { cyclomatic++; return super.visitConditionalExpression(node, unused); }
        @Override public Void visitBinary(BinaryTree node, Void unused) {
            if (node.getKind() == Tree.Kind.CONDITIONAL_AND || node.getKind() == Tree.Kind.CONDITIONAL_OR) cyclomatic++;
            return super.visitBinary(node, unused);
        }
        @Override public Void visitReturn(ReturnTree node, Void unused) { returns++; return super.visitReturn(node, unused); }
    }
}