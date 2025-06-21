# frontend/Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reactuser -u 1001

# Copy package.json and remove any existing lock file
COPY package.json ./
RUN rm -f package-lock.json

# Install dependencies fresh
RUN npm install && npm cache clean --force

# Copy source code
COPY --chown=reactuser:nodejs . .

# Build the React app
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Switch to non-root user
USER reactuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Run the production build
CMD ["serve", "-s", "build", "-l", "3000"]