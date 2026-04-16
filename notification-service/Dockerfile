# ─────────────────────────────────────────────
# Dockerfile – Notification Service
# ─────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

EXPOSE 5005

CMD ["node", "server.js"]
