#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  clinic_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [ -x "$clinic_runtime/node" ]; then
    PATH="$clinic_runtime:$PATH"
    export PATH
  else
    echo 'Please install Node.js 24 or newer, then run pnpm install.' >&2
    exit 1
  fi
fi
if [ ! -d node_modules/next ]; then
  echo 'Install dependencies with pnpm install before starting.' >&2
  exit 1
fi
exec node scripts/dev.mjs
