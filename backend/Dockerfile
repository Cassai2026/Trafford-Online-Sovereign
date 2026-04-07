FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

EXPOSE 4000

# Liveness check — Hub must respond /health within 5 s, retry 3 times before marking unhealthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Run as non-root
RUN addgroup -S sovereign && adduser -S sovereign -G sovereign
USER sovereign

CMD ["node", "src/index.js"]
