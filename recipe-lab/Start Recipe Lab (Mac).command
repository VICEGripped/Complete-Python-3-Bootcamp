#!/bin/bash
# Double-click this file to start Recipe Lab on a Mac.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js isn't installed yet."
  echo "  Download the LTS version from https://nodejs.org, install it, then double-click this file again."
  echo ""
  open "https://nodejs.org"
  read -p "  Press Enter to close..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "  First run: installing (takes about a minute)..."
  npm install --no-fund --no-audit || { read -p "  Install failed. Press Enter to close..."; exit 1; }
fi
node server.js
read -p "  Press Enter to close..."
