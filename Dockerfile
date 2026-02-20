FROM ubuntu:24.04

ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION_BUILD=22
ENV NODE_VERSION_RUN_1=20
ENV NODE_VERSION_RUN_2=22
ENV NODE_VERSION_RUN_3=24

RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install nvm and the required Node versions
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    nvm install $NODE_VERSION_BUILD && \
    nvm install $NODE_VERSION_RUN_1 && \
    nvm install $NODE_VERSION_RUN_3

WORKDIR /app

# 1. Build pqc-tracer first (its dist/ is gitignored, so we must build it here)
COPY pqc-tracer ./pqc-tracer
WORKDIR /app/pqc-tracer
RUN . "$NVM_DIR/nvm.sh" && nvm use $NODE_VERSION_BUILD && npm install && npm run build

# 2. Build the main project
WORKDIR /app
COPY package.json package-lock.json ./
COPY src ./src
COPY tsconfig.json ./
RUN . "$NVM_DIR/nvm.sh" && nvm use $NODE_VERSION_BUILD && npm install && npm run build

COPY run.sh ./
RUN chmod +x run.sh

CMD ["./run.sh"]
