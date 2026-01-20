FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy TypeScript configs
COPY tsconfig.json ./
COPY tsconfig.knex.json ./

# Copy source code
COPY src ./src
COPY knexfile.ts ./

# Build TypeScript
RUN npx tsc --skipLibCheck && \
    echo "TypeScript build completed" && \
    ls -la dist/ && \
    test -f dist/server.js || (echo "ERROR: dist/server.js not found!" && exit 1)

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json .

# Copy TypeScript files needed for migrations
COPY --from=build /app/knexfile.ts .
COPY --from=build /app/tsconfig.json .
COPY --from=build /app/tsconfig.knex.json .
COPY --from=build /app/src/database ./src/database
COPY --from=build /app/src/config ./src/config

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create data directory and set ownership
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/server.js"]
