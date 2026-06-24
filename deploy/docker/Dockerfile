# Runs the Airlock support-agent demo against Redis. Build context is the repo
# root so the TypeScript package can be copied in.
FROM node:24-alpine

WORKDIR /app
RUN corepack enable

# Install dependencies first for layer caching. pnpm-workspace.yaml carries the
# build-script approvals (esbuild), so it must be present before install.
COPY packages/ts/package.json packages/ts/pnpm-lock.yaml packages/ts/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Source and the example.
COPY packages/ts/tsconfig.json ./
COPY packages/ts/src ./src
COPY packages/ts/examples ./examples

CMD ["pnpm", "demo:redis"]
