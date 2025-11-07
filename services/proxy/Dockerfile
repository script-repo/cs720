# Multi-stage build for CS720 Proxy Service
# Compatible with kaniko, buildkit, and containerd
FROM node:20-alpine AS builder

WORKDIR /build

# Copy shared module to match workspace structure
COPY shared/ ./shared/
WORKDIR /build/shared
RUN npm ci && npm run build

# Build proxy service - maintain relative path structure
WORKDIR /build
COPY services/proxy/ ./services/proxy/
WORKDIR /build/services/proxy
RUN npm ci && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy shared module build output
COPY --from=builder /build/shared/dist ./node_modules/@cs720/shared/dist
COPY --from=builder /build/shared/package.json ./node_modules/@cs720/shared/

# Copy application
COPY --from=builder /build/services/proxy/dist ./dist
COPY --from=builder /build/services/proxy/package*.json ./

# Install only production dependencies (will link to shared module)
RUN npm ci --only=production && \
    npm cache clean --force

# Set permissions
RUN chown -R node:node /app

# Use non-root user for security
USER node

# Expose port
EXPOSE 3002

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "dist/server.js"]
