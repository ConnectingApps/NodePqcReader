FROM node:22

WORKDIR /app

COPY pqc-tracer ./pqc-tracer
COPY package.json package-lock.json ./
COPY src ./src
COPY tsconfig.json ./

# Build with Node 22 (already provided by the base image — zero setup)
RUN npm install && npm run build

# Install 'n' and pre-cache Node 22 and Node 24
RUN npm install -g n && n 22 && n 24

CMD echo "=== Running with Node 22 ===" && \
    n exec 22 node -p "process.versions.openssl" && \
    n exec 22 node dist/index.js && \
    echo "=== Running with Node 24 ===" && \
    n exec 24 node -p "process.versions.openssl" && \
    n exec 24 node dist/index.js
