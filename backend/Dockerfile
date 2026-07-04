# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy backend package files
COPY backend/package*.json ./backend/
COPY backend/tsconfig*.json ./backend/

# Install dependencies (using npm workspace if applicable, otherwise normal npm install)
RUN npm install --workspace=backend

# Copy backend source
COPY backend/ ./backend/

# Build backend
WORKDIR /app/backend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Install production dependencies only
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install --workspace=backend --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/backend/dist ./backend/dist
# Copy prisma schema if needed for migrations/client
COPY --from=builder /app/backend/prisma ./backend/prisma

WORKDIR /app/backend

# Generate prisma client for production
RUN npx prisma generate

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["npm", "start"]
