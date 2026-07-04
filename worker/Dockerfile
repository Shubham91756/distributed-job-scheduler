# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY worker/package*.json ./worker/
COPY worker/tsconfig*.json ./worker/
COPY database/ ./database/
RUN npm install --workspace=worker
COPY worker/ ./worker/
WORKDIR /app/worker
RUN npx prisma generate --schema=../database/schema.prisma
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY worker/package*.json ./worker/
COPY database/ ./database/
RUN npm install --workspace=worker --omit=dev
COPY --from=builder /app/worker/dist ./worker/dist
WORKDIR /app/worker
RUN npx prisma generate --schema=../database/schema.prisma
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
CMD ["npm", "start"]
