/**
 * Calculates DIT (Depth of Inheritance Tree) and NOC (Number of Children) for all classes.
 */
function computeInheritanceTrees(classList, extendsMap) {
  const ditMap = new Map();
  const nocMap = new Map();

  for (const c of classList) nocMap.set(c.name, 0);

  for (const c of classList) {
    if (c.extends && nocMap.has(c.extends)) {
      nocMap.set(c.extends, nocMap.get(c.extends) + 1);
    }
  }

  for (const c of classList) {
    let depth = 0;
    let curr = c.extends;
    const visited = new Set([c.name]);
    while (curr && !visited.has(curr)) {
      depth++;
      visited.add(curr);
      curr = extendsMap.get(curr);
    }
    ditMap.set(c.name, depth);
  }

  return { ditMap, nocMap };
}

/**
 * Finds all distinct external classes coupled to a class or any of its methods (CBO).
 */
function collectForeignClasses(memberIds, outboundDirect, catalog, currentClassName) {
  const foreignClasses = new Set();

  for (const memberId of memberIds) {
    const targets = outboundDirect.get(memberId);
    if (!targets) continue;

    for (const tid of targets) {
      const tSym = catalog.get(tid);
      if (!tSym) continue;

      const targetClass = tSym.type === 'class' ? tSym.name : tSym.parentClass;
      if (targetClass && targetClass !== currentClassName) {
        foreignClasses.add(targetClass);
      }
    }
  }

  return foreignClasses;
}

/**
 * Resolves all method symbols belonging to a class.
 */
function getMethodsForClass(sym, catalog) {
  if (!sym.methods) return [];
  return sym.methods.map(m => catalog.get(m.id)).filter(Boolean);
}

/**
 * Sums cyclomatic, cognitive, and LOC totals for a class method list (WMC).
 */
function calculateWmc(methods) {
  let wmcCyclomatic = 0;
  let wmcCognitive = 0;
  let wmcLoc = 0;

  for (const m of methods) {
    wmcCyclomatic += m.cyclomaticComplexity || 1;
    wmcCognitive += m.cognitiveComplexity || 0;
    wmcLoc += m.loc || 0;
  }

  return { wmcCyclomatic, wmcCognitive, wmcLoc };
}

/**
 * Computes Chidamber & Kemerer Object-Oriented Metrics for all classes in the catalog:
 * - WMC: Weighted Methods per Class (sum of cyclomatic and cognitive complexity)
 * - CBO: Coupling Between Object Classes (distinct external classes invoked/referenced)
 * - DIT: Depth of Inheritance Tree (inheritance chain depth)
 * - NOC: Number of Children (immediate subclasses count)
 */
function computeClassMetrics(catalog, outboundDirect) {
  const classList = [];
  const extendsMap = new Map();
  const classToMethods = new Map();

  for (const sym of catalog.values()) {
    if (sym.type !== 'class') continue;
    classList.push(sym);
    if (sym.extends) extendsMap.set(sym.name, sym.extends);
    classToMethods.set(sym.id, getMethodsForClass(sym, catalog));
  }

  const { ditMap, nocMap } = computeInheritanceTrees(classList, extendsMap);
  const classMetricsList = [];

  for (const c of classList) {
    const methods = classToMethods.get(c.id) || [];
    const { wmcCyclomatic, wmcCognitive, wmcLoc } = calculateWmc(methods);

    const allClassMemberIds = new Set([c.id, ...methods.map(m => m.id)]);
    const foreignClasses = collectForeignClasses(allClassMemberIds, outboundDirect, catalog, c.name);

    const classMetrics = {
      className: c.name,
      methodsCount: methods.length,
      wmcCyclomatic,
      wmcCognitive,
      wmcLoc,
      cbo: foreignClasses.size,
      cboClasses: Array.from(foreignClasses),
      dit: ditMap.get(c.name) || 0,
      noc: nocMap.get(c.name) || 0
    };

    c.classMetrics = classMetrics;
    c.cyclomaticComplexity = wmcCyclomatic;
    c.cognitiveComplexity = wmcCognitive;
    classMetricsList.push(classMetrics);

    for (const m of methods) {
      m.classMetrics = classMetrics;
    }
  }

  return classMetricsList;
}

module.exports = {
  computeClassMetrics,
  computeInheritanceTrees,
  collectForeignClasses,
  getMethodsForClass,
  calculateWmc
};
