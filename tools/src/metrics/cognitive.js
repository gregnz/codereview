/**
 * Computes SonarSource Cognitive Complexity for a function body AST node.
 * Increments for breaks in linear flow (loops, if, catch, switch, ternary)
 * plus nesting penalties for nested structures, and flat increments for logical operators.
 */
function getCognitiveComplexity(bodyNode, currentNesting = 0) {
  if (!bodyNode) return 0;
  let score = 0;

  function walk(node, nesting) {
    const type = node.type;

    // 1. Loops: for, while, do
    if (['for_statement', 'for_in_statement', 'for_of_statement', 'while_statement', 'do_statement'].includes(type)) {
      score += 1 + nesting;
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
          walk(child, nesting + 1);
        }
      }
      return;
    }

    // 2. If statement
    if (type === 'if_statement') {
      const isElseIf = node.parent && node.parent.type === 'else_clause';
      score += isElseIf ? 1 : (1 + nesting);

      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child.type === 'else_clause') {
          const elseBody = child.namedChildren[0];
          if (elseBody && elseBody.type === 'if_statement') {
            walk(elseBody, nesting);
          } else if (elseBody) {
            score += 1;
            walk(elseBody, nesting + 1);
          }
        } else if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
          walk(child, nesting + 1);
        }
      }
      return;
    }

    // 3. Switch statement (switch increments + nesting; individual cases do not)
    if (type === 'switch_statement') {
      score += 1 + nesting;
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
          walk(child, nesting + 1);
        }
      }
      return;
    }

    // 4. Catch clause
    if (type === 'catch_clause') {
      score += 1 + nesting;
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
          walk(child, nesting + 1);
        }
      }
      return;
    }

    // 5. Ternary expression
    if (type === 'ternary_expression') {
      score += 1 + nesting;
      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
          walk(child, nesting + 1);
        }
      }
      return;
    }

    // 6. Logical operators (&&, ||, ??) - flat +1 without nesting penalty
    if (type === 'binary_expression') {
      const hasLogicalOp = node.children.some(c => ['&&', '||', '??'].includes(c.text));
      if (hasLogicalOp) {
        score += 1;
      }
    }

    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
        walk(child, nesting);
      }
    }
  }

  walk(bodyNode, currentNesting);
  return score;
}

module.exports = {
  getCognitiveComplexity
};
