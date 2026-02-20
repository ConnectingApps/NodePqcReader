#!/bin/bash
set -e

. "$NVM_DIR/nvm.sh"

echo "=== Running with Node $NODE_VERSION_RUN_1 ==="
nvm use $NODE_VERSION_RUN_1
node -p "process.versions.openssl"
node dist/index.js

echo "=== Running with Node $NODE_VERSION_RUN_2 ==="
nvm use $NODE_VERSION_RUN_2
node -p "process.versions.openssl"
node dist/index.js

echo "=== Running with Node $NODE_VERSION_RUN_3 ==="
nvm use $NODE_VERSION_RUN_3
node -p "process.versions.openssl"
node dist/index.js
