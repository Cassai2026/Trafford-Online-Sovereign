FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

EXPOSE 4000

# Run as non-root
RUN addgroup -S sovereign && adduser -S sovereign -G sovereign
USER sovereign

CMD ["node", "src/index.js"]
