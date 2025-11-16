# Multi-stage build for CS720 AI Service
# Compatible with kaniko, buildkit, and containerd
FROM node:20-alpine AS builder

WORKDIR /build

# Copy shared module to match workspace structure
COPY shared/ ./shared/
WORKDIR /build/shared
RUN npm ci && npm run build

# Build ai-service - maintain relative path structure
WORKDIR /build
COPY services/ai-service/ ./services/ai-service/
WORKDIR /build/services/ai-service
RUN npm ci && npm run build

# Verify build output - ensure critical files exist
RUN ls -la dist/ && \
    ls -la dist/clients/ && \
    test -f dist/server.js && \
    test -f dist/clients/ollama.js && \
    test -f dist/clients/proxy.js || \
    (echo "ERROR: Build did not produce expected dist files" && exit 1)

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy application and dependencies from builder
# Copy dist directory recursively to ensure all subdirectories are included
COPY --from=builder /build/services/ai-service/dist/ ./dist/
COPY --from=builder /build/services/ai-service/package*.json ./
COPY --from=builder /build/services/ai-service/node_modules ./node_modules

# Replace @cs720/shared symlink with actual built files (ensures @cs720/shared is available)
COPY --from=builder /build/shared/dist ./node_modules/@cs720/shared/dist
COPY --from=builder /build/shared/package.json ./node_modules/@cs720/shared/package.json

# Verify production image has required files
RUN test -f dist/server.js && \
    test -f dist/clients/ollama.js && \
    test -f dist/clients/proxy.js || \
    (echo "ERROR: Required dist files missing in production image" && exit 1)

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
