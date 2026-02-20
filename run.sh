#!/bin/bash
set -e

. "$NVM_DIR/nvm.sh"

echo "=== Running with Node $NODE_VERSION_RUN_1 ==="
nvm use $NODE_VERSION_RUN_1
echo "OpenSSL Version"
node -p "process.versions.openssl"
node dist/index.js

echo "=== Running with Node $NODE_VERSION_RUN_2 ==="
nvm use $NODE_VERSION_RUN_2
echo "OpenSSL Version"
node -p "process.versions.openssl"
node dist/index.js

echo "=== Running with Node $NODE_VERSION_RUN_3 ==="
nvm use $NODE_VERSION_RUN_3
echo "OpenSSL Version"
node -p "process.versions.openssl"
node dist/index.js
