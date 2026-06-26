# Ayalas — Chatbot + CRM para gimnasio

Proyecto de Orway Group. CRM multicanal (WhatsApp / Instagram / Messenger) + chatbot
de captación y retención para un gimnasio.

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · n8n (orquestador del bot) · PM2.

## Estado por fases

| Fase | Módulo | Estado |
|------|--------|--------|
| 1 | Scaffold + schema + login (Staff) | ✅ |
| 2 | Ingesta `/api/bot/messages` + Inbox | ⏳ |
| 3 | Tags (CRUD + picker) | ⏳ |
| 4 | Bot Info 24/7 + captura de Lead + reserva de clase | ⏳ |
| 5 | Dashboard (métricas de gym) | ⏳ |
| 6 | Marketing (campañas por tag) | ⏳ |
| 7 | Infra / deploy en VPS | ⏳ |

## Desarrollo local

Requisitos: Node 20+, Docker (para Postgres local) o un PostgreSQL accesible.

```bash
# 1) Variables de entorno
cp .env.example .env        # y rellena los valores (mínimo DATABASE_URL y SESSION_SECRET)

# 2) Postgres local con Docker (opcional, mapeado al puerto 5433)
docker run -d --name ayalas-pg -e POSTGRES_USER=ayalas -e POSTGRES_PASSWORD=ayalas \
  -e POSTGRES_DB=ayalas_db -p 5433:5432 postgres:16

# 3) Dependencias + cliente Prisma
npm install
npm run db:generate

# 4) Esquema + datos de ejemplo
npm run db:push
npm run db:seed

# 5) Arrancar (puerto 3001)
npm run dev
```

Entra a http://localhost:3001 → te redirige a `/login`.
Credenciales del admin = `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`.

## Scripts

- `npm run dev` — servidor de desarrollo (puerto 3001)
- `npm run build` / `npm start` — producción
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:push` — aplica el schema a la BD (sin migraciones)
- `npm run db:seed` — admin + planes/clases/tags/config de ejemplo
- `npm run db:studio` — Prisma Studio

## Gotchas críticos (heredados de producción)

1. **Token de Meta = System User permanente** (caducidad "Nunca"). Los temporales expiran y
   rompen el **envío** en silencio (error 190). Nunca hardcodear: usar `.env` + Credentials de n8n.
2. **No mutilar PSID/IGSID** de Messenger/Instagram con lógica de teléfono.
3. **`mid @unique` + `createMany({skipDuplicates:true})`** — Meta re-entrega webhooks.
4. **Soft-delete** de mensajes borrados (no hard-delete) — historial + cumplimiento Meta.
5. **Gráficas móviles con scroll interno**, no `repeat(N,1fr)`.

## Despliegue (VPS Orway, resumen — Fase 7)

`/var/www/ayalas`, base `ayalas_db` con usuario propio, puerto 3001, bloque Nginx para el
dominio de Ayalas, SSL con certbot, proceso bajo PM2 (`pm2 start ecosystem.config.js`).
