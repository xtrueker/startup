# ETAPA 1: Build (Compilación limpia en Linux)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ETAPA 2: Producción (Imagen ligera y segura)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copiar solo archivos necesarios
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist

# Ejecución (Sin EXPOSE, Cloud Run usa PORT dinámico)
CMD ["node", "dist/server.js"]
