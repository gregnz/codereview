/**
 * Computes McCabe Cyclomatic Complexity v(G) for a function body AST node.
 * Base complexity is 1, incremented for each decision point (branches, loops, logical operators).
 */
function getCyclomaticComplexity(bodyNode) {
  if (!bodyNode) return 1;
  let complexity = 1;

  function walk(node) {
    const type = node.type;
    if (
      [
        'if_statement',
        'for_statement',
        'for_in_statement',
        'for_of_statement',
        'while_statement',
        'do_statement',
        'catch_clause',
        'ternary_expression',
        'switch_case'
      ].includes(type)
    ) {
      complexity++;
    } else if (type === 'binary_expression') {
      const hasLogicalOp = node.children.some(c => ['&&', '||', '??'].includes(c.text));
      if (hasLogicalOp) complexity++;
    }

    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
        walk(child);
      }
    }
  }

  walk(bodyNode);
  return complexity;
}

module.exports = {
  getCyclomaticComplexity
};
