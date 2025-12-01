#!/usr/bin/env bash
# verify-security.sh
# Lightweight security check runner for local + CI use.
# Runs gitleaks if available to detect committed secrets.

set -euo pipefail

if command -v gitleaks &> /dev/null; then
  echo "[verify-security] gitleaks found in PATH, running scan..."
  gitleaks detect --source . --config .gitleaks.toml
else
  echo "[verify-security] gitleaks not found in PATH."
  echo "[verify-security] Please install gitleaks to enable secret scanning:"
  echo "  https://github.com/gitleaks/gitleaks#installing"
  # Exit 0 so local dev doesn’t break if gitleaks isn’t installed
  exit 0
fi

echo "[verify-security] completed successfully."
