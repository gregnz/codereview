#!/usr/bin/env bash
set -euo pipefail

# Resolve physical script location even when invoked via symlink
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd -P)"

# Resolve CLI executable: global binary on PATH > repo-local tools/cli.js
if command -v codereview >/dev/null 2>&1; then
  CLI_BIN="codereview"
elif [ -f "$REPO_ROOT/tools/cli.js" ]; then
  CLI_BIN="node $REPO_ROOT/tools/cli.js"
else
  echo "Error: Neither 'codereview' command nor '$REPO_ROOT/tools/cli.js' was found."
  exit 1
fi

TARGET="${1:-.}"
MODE="${2:-all}"

echo "=========================================================="
echo " Running Code Review Analyzer on: ${TARGET}"
echo " Mode: ${MODE}"
echo "=========================================================="

case "$MODE" in
  lint)
    $CLI_BIN lint "$TARGET"
    ;;
  concept)
    QUERY="${3:-}"
    if [ -z "$QUERY" ]; then
      echo "Error: Concept query required."
      echo "Usage: $0 [targetDir] concept \"query string\""
      exit 1
    fi
    $CLI_BIN concept "$QUERY" "$TARGET"
    ;;
  query)
    PATTERN="${3:-}"
    if [ -z "$PATTERN" ]; then
      echo "Error: Query pattern required."
      echo "Usage: $0 [targetDir] query \"symbol1|symbol2\""
      exit 1
    fi
    $CLI_BIN query "$PATTERN" "$TARGET"
    ;;
  blast)
    SYMBOL="${3:-}"
    if [ -z "$SYMBOL" ]; then
      echo "Error: Symbol identifier required."
      echo "Usage: $0 [targetDir] blast \"Class.method\""
      exit 1
    fi
    $CLI_BIN blast "$SYMBOL" "$TARGET"
    ;;
  diff)
    REF="${3:-HEAD}"
    $CLI_BIN diff "$REF" "$TARGET"
    ;;
  sync|map|graph)
    $CLI_BIN sync "$TARGET"
    ;;
  inspect)
    $CLI_BIN inspect "$TARGET"
    ;;
  feedback)
    MSG="${3:-}"
    if [ -z "$MSG" ]; then
      echo "Error: Feedback message required."
      echo "Usage: $0 [targetDir] feedback \"message\""
      exit 1
    fi
    $CLI_BIN feedback "$MSG" "$TARGET"
    ;;
  improve)
    APPLY_FLAG="${3:-}"
    if [ "$APPLY_FLAG" = "--apply" ]; then
      $CLI_BIN improve "$TARGET" --apply
    else
      $CLI_BIN improve "$TARGET"
    fi
    ;;
  all)
    echo "1/3: Running architectural & complexity scorecard..."
    $CLI_BIN lint "$TARGET"
    echo ""
    echo "2/3: Synchronizing symbol map and Graph IR..."
    $CLI_BIN sync "$TARGET"
    echo ""
    echo "3/3: Diagnostic summary..."
    $CLI_BIN inspect "$TARGET"
    echo ""
    echo "✅ Analysis complete. All reports and visual datasets updated."
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: $0 [targetDir (default: .)] [all|lint|concept|query|blast|diff|sync|inspect] [query|symbol|ref]"
    exit 1
    ;;
esac
