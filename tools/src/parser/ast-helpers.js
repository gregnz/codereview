function getLeadingComment(node, sourceLines) {
  const targetNode = (node.parent && node.parent.type === 'export_statement') ? node.parent : node;
  let prev = targetNode.previousNamedSibling;
  if (!prev) {
    const startLine = targetNode.startPosition.row;
    if (startLine > 0 && sourceLines) {
      const prevLine = sourceLines[startLine - 1].trim();
      if (prevLine.startsWith('//') || prevLine.endsWith('*/') || prevLine.startsWith('*')) {
        return prevLine.replace(/^\/\/\s*|\/\*\s*|\s*\*\/$|^\*\s*/g, '').trim();
      }
    }
    return null;
  }
  if (prev.type === 'comment') {
    const text = prev.text.trim();
    const lines = text
      .split('\n')
      .map(l => l.replace(/^\/\*\*?\s*|^\/\/\s*|\s*\*\/$|^\*\s*/g, '').trim())
      .filter(l => Boolean(l) && l !== '*');
    return lines.length > 0 ? lines[0] : null;
  }
  return null;
}

function getMaxBlockDepth(node, currentDepth = 0) {
  let maxDepth = currentDepth;
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
      continue;
    }
    let nextDepth = currentDepth;
    if (['if_statement', 'for_statement', 'for_in_statement', 'for_of_statement', 'while_statement', 'do_statement', 'switch_statement', 'catch_clause'].includes(child.type)) {
      nextDepth = currentDepth + 1;
    }
    const d = getMaxBlockDepth(child, nextDepth);
    if (d > maxDepth) maxDepth = d;
  }
  return maxDepth;
}

function getParamCount(node) {
  const params = node.childForFieldName('parameters');
  if (params) {
    return params.namedChildCount;
  }
  const singleParam = node.childForFieldName('parameter');
  if (singleParam) {
    return 1;
  }
  return 0;
}

function getReturnCount(bodyNode) {
  if (!bodyNode) return 0;
  let count = 0;
  function walk(node) {
    if (node.type === 'return_statement') {
      count++;
    }
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!['function_declaration', 'function_expression', 'arrow_function'].includes(child.type)) {
        walk(child);
      }
    }
  }
  walk(bodyNode);
  return count;
}

module.exports = {
  getLeadingComment,
  getMaxBlockDepth,
  getParamCount,
  getReturnCount
};
