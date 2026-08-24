# ==========================================
# Builder Stage: Frontend (React + Vite)
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app/client

# Copy package files and install dependencies
COPY client/package*.json ./
RUN npm ci

# Copy client source code
COPY client/ ./

# Build the frontend. 
# Inject VITE_API_URL=/api so Axios uses relative paths, ensuring Docker portability.
RUN VITE_API_URL=/api npm run build

# ==========================================
# Runtime Stage: Backend (Node + Express + Puppeteer)
# ==========================================
FROM node:18-bullseye-slim AS runtime

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=5000

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy server package files and install production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source code
COPY server/ ./server/

# Copy the built React static files from the builder stage
# Placed into server/public/dist so Express can serve them (ADR-002)
COPY --from=builder /app/client/dist ./server/public/dist

# Create exports directory and ensure proper permissions for the 'node' user
RUN mkdir -p ./server/public/exports && \
    chown -R node:node /usr/src/app

# Switch to non-root user for security
USER node

# Setup Entrypoint & Healthcheck scripts and fix Windows CRLF line endings
COPY --chown=node:node entrypoint.sh healthcheck.sh ./
RUN sed -i 's/\r$//' entrypoint.sh healthcheck.sh && chmod +x entrypoint.sh healthcheck.sh

EXPOSE 5000

# Health check: verify the Express server is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ./healthcheck.sh

# Use dumb-init as PID 1 to properly handle signals and reap zombie processes
# This ensures Chrome child processes from Puppeteer are properly cleaned up on shutdown
ENTRYPOINT ["dumb-init", "--", "./entrypoint.sh"]
CMD ["node", "server/index.js"]
