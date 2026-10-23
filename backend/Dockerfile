# Multi-stage production build for NestJS Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install openssl for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl libc6-compat

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=10000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Create uploads directory if local disk storage is used
RUN mkdir -p uploads/chat uploads/documents

EXPOSE 10000

CMD ["sh", "-c", "npx prisma db push && (npm run seed:all || true) && node dist/main"]
