# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY scheduler/package*.json ./scheduler/
COPY scheduler/tsconfig*.json ./scheduler/
COPY database/ ./database/
RUN npm install --workspace=scheduler
COPY scheduler/ ./scheduler/
WORKDIR /app/scheduler
RUN npx prisma generate --schema=../database/schema.prisma
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY scheduler/package*.json ./scheduler/
COPY database/ ./database/
RUN npm install --workspace=scheduler --omit=dev
COPY --from=builder /app/scheduler/dist ./scheduler/dist
WORKDIR /app/scheduler
RUN npx prisma generate --schema=../database/schema.prisma
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
CMD ["npm", "start"]
