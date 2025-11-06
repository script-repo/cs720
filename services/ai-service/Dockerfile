# Multi-stage build for CS720 AI Service
# Compatible with kaniko, buildkit, and containerd
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared module
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm ci && npm run build

# Build ai-service
WORKDIR /app/ai-service
COPY services/ai-service/package*.json ./
RUN npm ci

COPY services/ai-service/ ./
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY --from=builder /app/shared ./shared

# Copy package files and install production dependencies
COPY services/ai-service/package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/ai-service/dist ./dist

# Set permissions
RUN chown -R node:node /app

# Use non-root user for security
USER node

# Expose port
EXPOSE 3003

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "dist/server.js"]
