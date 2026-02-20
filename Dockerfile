FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    build-essential \
    python3 \
    git \
    && rm -rf /var/lib/apt/lists/*

ENV NVM_DIR=/root/.nvm

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" \
    && nvm install 22 \
    && nvm install 24

WORKDIR /app

COPY pqc-tracer ./pqc-tracer
COPY package.json package-lock.json ./
COPY src ./src
COPY tsconfig.json ./

RUN bash -c '. "$NVM_DIR/nvm.sh" && nvm use 22 && npm install && npm run build'

CMD bash -c '. "$NVM_DIR/nvm.sh" \
    && echo "=== Running with Node 22 ===" \
    && nvm use 22 \
    && node -p "process.versions.openssl" \
    && node dist/index.js \
    && echo "=== Running with Node 24 ===" \
    && nvm use 24 \
    && node -p "process.versions.openssl" \
    && node dist/index.js'
