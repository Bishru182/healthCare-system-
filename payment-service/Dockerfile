# ─────────────────────────────────────────────
# Dockerfile – Payment Service
# Multi-stage build: dependencies → production image
# ─────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first (better layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ── Stage 2: Final production image ──────────
FROM node:20-alpine AS runner

# Add a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Ensure non-root user owns the app files
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the default port
EXPOSE 5003

# Health check so Docker / orchestrators know the service is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5003/health || exit 1

# Start the service
CMD ["node", "server.js"]
