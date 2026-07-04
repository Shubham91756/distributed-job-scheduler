# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/tsconfig*.json ./backend/
COPY database/ ./database/
RUN npm install --workspace=backend
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npx prisma generate --schema=../database/schema.prisma
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY database/ ./database/
RUN npm install --workspace=backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
WORKDIR /app/backend
RUN npx prisma generate --schema=../database/schema.prisma
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3000
CMD ["npm", "start"]
