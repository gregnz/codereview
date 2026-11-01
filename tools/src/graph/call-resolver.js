const { LIFECYCLE_NAMES } = require('../config/layers');

function resolveCalleeTargets(call, catalog, nameToIds) {
  // 1. Explicit fullCallee match (e.g. "Ship.takeDamage" or "this.completeDestruction" -> Ship.completeDestruction)
  if (nameToIds.has(call.fullCallee)) {
    return Array.from(nameToIds.get(call.fullCallee));
  }

  // 2. Class receiver hint (e.g. ship.takeDamage -> Ship.takeDamage)
  if (call.receiver) {
    const rawRecv = call.receiver.trim();
    const lastProp = rawRecv.includes('.') ? rawRecv.split('.').pop().trim() : rawRecv;
    if (lastProp) {
      if (nameToIds.has(`${lastProp}.${call.calleeName}`)) {
        return Array.from(nameToIds.get(`${lastProp}.${call.calleeName}`));
      }
      const cap = lastProp.charAt(0).toUpperCase() + lastProp.slice(1);
      if (nameToIds.has(`${cap}.${call.calleeName}`)) {
        return Array.from(nameToIds.get(`${cap}.${call.calleeName}`));
      }
    }
  }

  // 3. Candidate resolution by short method name
  if (nameToIds.has(call.calleeName)) {
    const candidates = Array.from(nameToIds.get(call.calleeName));

    // 3a. Unique method/function in the entire codebase
    if (candidates.length === 1 && !LIFECYCLE_NAMES.has(call.calleeName)) {
      return candidates;
    }

    // 3b. Receiver prefix match against candidate classes (e.g. ast -> Asteroid, proj -> Projectile)
    if (call.receiver) {
      const rawRecv = call.receiver.trim();
      const lastProp = rawRecv.includes('.') ? rawRecv.split('.').pop().trim() : rawRecv;
      if (lastProp && lastProp.length >= 3) {
        const prefixMatches = candidates.filter(id => {
          const sym = catalog.get(id);
          return sym?.parentClass && sym.parentClass.toLowerCase().startsWith(lastProp.toLowerCase());
        });
        if (prefixMatches.length === 1) {
          return prefixMatches;
        }
      }
    }
  }

  // Overloaded method on an untyped/unresolvable receiver: do NOT fan out to unrelated classes
  return [];
}

module.exports = {
  resolveCalleeTargets
};
