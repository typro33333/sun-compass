# syntax=docker/dockerfile:1
ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-alpine AS builder
WORKDIR /app
COPY package.json server.js ./
COPY lib ./lib
COPY scripts ./scripts
COPY dist ./dist
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5173 \
    LOG_LEVEL=info
COPY --from=builder --chown=bun:bun /app/build/ ./
USER bun
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e 'const r = await fetch("http://127.0.0.1:" + (process.env.PORT || "5173") + "/app.js", { method: "HEAD" }); process.exit(r.ok ? 0 : 1);'
CMD ["bun", "server.js"]
