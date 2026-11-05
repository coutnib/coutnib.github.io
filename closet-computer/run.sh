#!/usr/bin/env bash
# Closet Computer launcher for macOS / Linux.  Usage: ./run.sh   (add --lan to use it from your phone)
set -e
cd "$(dirname "$0")"
PY=${PYTHON:-python3}
if [ ! -d .venv ]; then
  echo "First run: setting up (one time, ~1 minute)..."
  $PY -m venv .venv
  .venv/bin/pip install --upgrade pip -q
  .venv/bin/pip install -r requirements.txt -q
  .venv/bin/pip install pillow-heif -q || echo "(optional iPhone HEIC support not installed - JPG/PNG still work)"
fi
exec .venv/bin/python -m app "$@"
