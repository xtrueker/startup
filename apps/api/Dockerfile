# ============================================================================
# ETAPA 1: Compilación TypeScript (apps/api — Node 22 LTS para soporte ESM/CJS)
# ============================================================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ============================================================================
# ETAPA 2: Imagen Ligera de Producción (Compatible con Sharp, Socket.IO y TLS)
# ============================================================================
FROM node:22-bookworm-slim
WORKDIR /app

# Certificados raíz para conexiones HTTPS hacia Supabase, AWS Rekognition, Expo Push y Meta API
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/server.js"]
