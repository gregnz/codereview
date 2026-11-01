const { execSync } = require('node:child_process');

function isGitRepo(cwd = process.cwd()) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return true;
  } catch {
    return false;
  }
}

function getChangedLinesFromDiff(gitRef = 'HEAD', cwd = process.cwd()) {
  if (!isGitRepo(cwd)) {
    return new Map();
  }

  try {
    const diffOutput = execSync(`git diff ${gitRef} -U0`, {
      encoding: 'utf8',
      cwd,
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 50 * 1024 * 1024
    });
    const changedRanges = new Map(); // relFile -> Array of [startLine, endLine]

    let currentFile = null;
    const lines = diffOutput.split('\n');

    for (const line of lines) {
      if (line.startsWith('+++ b/')) {
        currentFile = line.slice(6).trim();
        if (!changedRanges.has(currentFile)) changedRanges.set(currentFile, []);
      } else if (line.startsWith('@@') && currentFile) {
        // @@ -oldStart,oldLen +newStart,newLen @@
        const match = line.match(/\+([0-9]+)(?:,([0-9]+))?/);
        if (match) {
          const start = parseInt(match[1], 10);
          const count = match[2] ? parseInt(match[2], 10) : 1;
          const end = start + Math.max(1, count) - 1;
          changedRanges.get(currentFile).push([start, end]);
        }
      }
    }

    // Also include untracked files so work-in-progress modules are surfaced in diff
    try {
      const untrackedOut = execSync('git ls-files --others --exclude-standard', {
        encoding: 'utf8',
        cwd,
        stdio: ['pipe', 'pipe', 'ignore']
      });
      for (const uLine of untrackedOut.split('\n')) {
        const uFile = uLine.trim();
        if (uFile && (uFile.endsWith('.js') || uFile.endsWith('.mjs') || uFile.endsWith('.cjs') || uFile.endsWith('.jsx'))) {
          if (!changedRanges.has(uFile)) {
            changedRanges.set(uFile, [[1, 999999]]);
          }
        }
      }
    } catch {
      // ignore if not a git repo
    }

    return changedRanges;
  } catch (err) {
    console.warn(`Warning: Could not compute git diff against '${gitRef}':`, err.message);
    return new Map();
  }
}

function intersectDiffWithSymbols(diffMap, index) {
  const changedSymbolIds = new Set();

  for (const [symId, sym] of index.catalog.entries()) {
    const fileRanges = diffMap.get(sym.file);
    if (fileRanges) {
      for (const [diffStart, diffEnd] of fileRanges) {
        if (Math.max(sym.startLine, diffStart) <= Math.min(sym.endLine, diffEnd)) {
          changedSymbolIds.add(symId);
          break;
        }
      }
    }
  }

  return changedSymbolIds;
}

module.exports = {
  getChangedLinesFromDiff,
  intersectDiffWithSymbols
};
