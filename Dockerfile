FROM node:22

WORKDIR /app

# 1. Build pqc-tracer first (its dist/ is gitignored, so we must build it here)
COPY pqc-tracer ./pqc-tracer
WORKDIR /app/pqc-tracer
RUN npm install && npm run build

# 2. Build the main project
WORKDIR /app
COPY package.json package-lock.json ./
COPY src ./src
COPY tsconfig.json ./
RUN npm install && npm run build

# 3. Install 'n' and pre-cache Node 22 and Node 24
RUN npm install -g n && n 22 && n 24

CMD echo "=== Running with Node 22 ===" && \
    n exec 22 node -p "process.versions.openssl" && \
    n exec 22 node dist/index.js && \
    echo "=== Running with Node 24 ===" && \
    n exec 24 node -p "process.versions.openssl" && \
    n exec 24 node dist/index.js
