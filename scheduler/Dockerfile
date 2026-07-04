# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

COPY scheduler/package*.json ./scheduler/
COPY scheduler/tsconfig*.json ./scheduler/

RUN npm install --workspace=scheduler

COPY scheduler/ ./scheduler/

WORKDIR /app/scheduler
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY scheduler/package*.json ./scheduler/
RUN npm install --workspace=scheduler --omit=dev

COPY --from=builder /app/scheduler/dist ./scheduler/dist
COPY --from=builder /app/scheduler/prisma ./scheduler/prisma

WORKDIR /app/scheduler

RUN npx prisma generate

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["npm", "start"]
