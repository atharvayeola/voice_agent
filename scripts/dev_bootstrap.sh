#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${PROJECT_ROOT}/.venv"
NODE_VERSION="20.15.0"

if [[ ! -d "${VENV_DIR}" ]]; then
  python3 -m venv "${VENV_DIR}"
fi

# shellcheck disable=SC1090
source "${VENV_DIR}/bin/activate"

python -m pip install --upgrade pip wheel >/dev/null
python -m pip install --upgrade nodeenv >/dev/null

if [[ ! -f "${VENV_DIR}/bin/node" ]]; then
  nodeenv --node="${NODE_VERSION}" --prebuilt "${VENV_DIR}" >/dev/null
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null
else
  printf "Warning: corepack not found inside virtual env. Install pnpm manually if needed.\n"
fi

printf "Virtual environment ready at %s\n" "${VENV_DIR}"
printf "Run 'source %s/bin/activate' before installing pnpm packages.\n" "${VENV_DIR}"
