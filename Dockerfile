# Ayalas — imagen para el VPS compartido (Docker + Traefik). Next 14 + Prisma 5.
# NO standalone a propósito: conserva node_modules COMPLETO para poder correr
# db:push / db:seed dentro del contenedor (provisión por cliente).

FROM node:22-slim AS build
WORKDIR /app
# Prisma 5 necesita openssl en Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# `npm run build` = prisma generate && next build. El engine de Prisma se genera
# para ESTA base (node:22-slim/Debian) → coincide con el runtime de abajo.
# El check de SESSION_SECRET es perezoso (lib/session.ts) → el build NO requiere
# SESSION_SECRET ni DATABASE_URL (las páginas son force-dynamic, no pegan a la BD).
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
# Copiamos todo (incluye node_modules con el engine de Prisma + prisma CLI + tsx
# para db:push/seed). Config 100% por env (DATABASE_URL al host `postgres`).
COPY --from=build /app ./
EXPOSE 3001
CMD ["npm", "run", "start"]
