#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS_OUT="$ROOT/../../docs/saas/arr-rebuild/gui-demo"

cd "$ROOT"
python3 tools/generate_demo_workbook.py
cd backend
DATA_DIR=/tmp/arr-v2-demo-data npx tsx ../tools/generate_demo_data.ts
cd ../frontend
npm run build
rsync -av --delete dist/ "$DOCS_OUT/"

echo "Published GUI demo to: $DOCS_OUT"
