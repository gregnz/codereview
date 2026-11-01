const fs = require('node:fs');
const path = require('node:path');
const { collectFiles } = require('../parser/javascript');

/**
 * Discovers candidate graph files or returns the default cache path.
 */
function resolveGraphPaths(targetDir, rootDir) {
  const candidatePaths = [
    path.join(targetDir, 'ast_graph.json'),
    path.join(rootDir, 'ast_graph.json'),
    path.join(rootDir, '.codereview', 'ast_graph.json'),
    path.join(rootDir, 'graph.json')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return { existingPath: p, defaultCachePath: p };
    }
  }

  const defaultCachePath = path.join(rootDir, '.codereview', 'ast_graph.json');
  return { existingPath: null, defaultCachePath };
}

/**
 * Verifies if an existing graph cache is fresh compared to source file mtimes.
 */
function isCacheFresh(graphFilePath, targetDir) {
  if (!graphFilePath || !fs.existsSync(graphFilePath)) return false;

  try {
    const graphStat = fs.statSync(graphFilePath);
    const graphMtime = graphStat.mtimeMs;
    const sourceFiles = collectFiles(targetDir);

    for (const file of sourceFiles) {
      const fileStat = fs.statSync(file);
      if (fileStat.mtimeMs > graphMtime) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Loads and parses cached Graph IR JSON.
 */
function loadCachedGraph(graphFilePath) {
  if (!fs.existsSync(graphFilePath)) return null;
  const content = fs.readFileSync(graphFilePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Persists Graph IR JSON to disk.
 */
function saveCachedGraph(graphData, cacheFilePath) {
  const dir = path.dirname(cacheFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(cacheFilePath, JSON.stringify(graphData, null, 2), 'utf8');
  return cacheFilePath;
}

module.exports = {
  resolveGraphPaths,
  isCacheFresh,
  loadCachedGraph,
  saveCachedGraph
};
