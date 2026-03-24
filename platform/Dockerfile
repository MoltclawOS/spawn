FROM oven/bun:1.2.14

WORKDIR /app

COPY package.json bun.lock ./
COPY manifest.json ./
COPY packages/shared ./packages/shared
COPY packages/cli ./packages/cli
COPY platform ./platform

RUN bun install --frozen-lockfile

EXPOSE 4173

CMD ["bun", "run", "platform/server.ts"]
