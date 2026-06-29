# Despliegue de Ayalas en el VPS compartido de Orway

> Runbook para subir Ayalas (CRM de gimnasios, **instancia por cliente**) al VPS
> compartido. La infra base (Traefik + Postgres + n8n) **YA está montada y
> funcionando** desde el deploy de Orway System — Ayalas solo se suma encima.
>
> Arquitectura canónica: repo **`orway-infra`** (`/opt/orway-infra` en el VPS,
> GitHub `orwaygroup-code/orway-infra`). Léelo si dudas. No improvises infra distinta.

---

## 0. Estado actual del VPS (lo que YA existe, no rehacer)

- **VPS Hostinger, Ubuntu, Docker 29.** IP **real = `2.24.217.100`**.
  ⚠️ **`2.57.91.91` es un CDN de Hostinger, NO el VPS** — nunca apuntes DNS ahí.
- **Infra compartida arriba** (`/opt/orway-infra`, `docker compose up -d`):
  - **Traefik** (`traefik:v3`) en 80/443, red Docker externa **`web`**, TLS
    automático por **HTTP-01**.
  - **Postgres** compartido (servicio interno `postgres`, NO expuesto). Superusuario
    `orway` (su pass está en `/opt/orway-infra/.env`).
  - **n8n** compartido (`n8n.orwaygroup.com`).
- **Orway System** ya corre en `orwaygroup.com` (apex). Ayalas va en **otro
  subdominio**.
- Repos clonados en **`/opt`** (no en `~`). Despliegues como root o vía `sudo`
  acotado por usuario.

### Lecciones del primer deploy (que Ayalas hereda gratis)
1. **DNS al VPS real `2.24.217.100`**, jamás al CDN `2.57.91.91` (rompe el challenge).
2. Traefik ya es `traefik:v3` y usa **HTTP-01** (no tocar — ya está en el compose).
3. **Rate-limit de Let's Encrypt:** 5 fallos/hora/dominio. No reinicies en bucle si
   un cert falla; arregla la causa (casi siempre el DNS) y espera.
4. Repos privados se clonan en el VPS con **deploy key SSH de solo lectura**.

---

## 1. Lo que falta del lado del repo de Ayalas (hacer una vez)

Ayalas es **una imagen, muchas instancias** (un gimnasio = mismo código, distinto
`.env`/BD). Para que sea desplegable faltan dos archivos en el repo.

### 1a. `Dockerfile` (raíz del repo de Ayalas)
```dockerfile
# Ayalas — imagen para el VPS compartido (Docker + Traefik). Next 14 + Prisma 5.
FROM node:22-slim AS build
WORKDIR /app
# Prisma 5 necesita openssl en Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# Imagen final. Conserva node_modules para poder correr db:push/seed dentro.
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
# Ayalas escucha en 3001 (es el puerto que declara la label de Traefik).
EXPOSE 3001
CMD ["npm", "run", "start"]
```
> Si el repo NO tiene `package-lock.json`, cambia `npm ci` por `npm install` (o
> genera el lock con `npm install` y commitéalo — preferible).

### 1b. `.dockerignore` (raíz)
```
node_modules
.next
.env
.env.*
!.env.example
.git
.gitignore
```

### 1c. Confirmar config por entorno
El `.env.example` de Ayalas ya espera `DATABASE_URL`, `SESSION_SECRET`,
`ADMIN_*`, `BOT_API_KEY`. **Importante para el VPS:** `DATABASE_URL` debe apuntar
al host **`postgres`** (red interna), no a `localhost`. Eso lo genera el script de
aprovisionamiento (paso 3), no hay que tocarlo a mano.

### 1d. `lib/session.ts` — check de SESSION_SECRET perezoso (¡necesario para el build!)
El check de `SESSION_SECRET` (>=32 chars) **no debe correr al importar el módulo**: si lo
hace, `next build` (y por ende `docker build`) truena porque en build no hay env. La
validación se movió a una función `getSessionOptions()` que se llama **por request**, no en
import. Sin esto, `docker build` falla en el paso `npm run build`.

> Commitea estos archivos a `master` del repo de Ayalas **antes** de desplegar.

---

## 2. DNS del cliente

Cada instancia de Ayalas usa un dominio/subdominio. Agrega su registro **A →
`2.24.217.100`** (el VPS real). Ej. para el primer gimnasio:

| Tipo | Nombre | Contenido |
|------|--------|-----------|
| A | `ayalas` (o el que toque) | `2.24.217.100` |

Espera a que propague (TTL bajo, ~minutos) **antes** de levantar el contenedor, o
Traefik no podrá emitir el certificado.

---

## 3. Desplegar en el VPS (como root, en `/opt`)

### 3a. Clonar el repo de Ayalas (privado → deploy key)
Si Ayalas aún no está clonado en el VPS:
```bash
# Genera una deploy key para Ayalas (si no existe ya una para este repo)
ssh-keygen -t ed25519 -C "vps-ayalas-deploy" -f /root/.ssh/ayalas_deploy -N ""
cat /root/.ssh/ayalas_deploy.pub
# → agrega ESA pública en GitHub: repo Ayalas → Settings → Deploy keys
#   (solo lectura, NO write access)

# Configura git para usar esa key con github y clona
cat >> /root/.ssh/config <<'CFG'
Host github-ayalas
  HostName github.com
  IdentityFile /root/.ssh/ayalas_deploy
  IdentitiesOnly yes
CFG
cd /opt
git clone git@github-ayalas:orwaygroup-code/Ayalas.git ayalas
```
> Orway usa la deploy key default (`/root/.ssh/id_ed25519`). Como son repos
> distintos, Ayalas necesita su **propia** deploy key con el alias de host de arriba.

### 3b. Construir la imagen
```bash
cd /opt/ayalas
docker build -t ayalas:latest .
```

### 3c. Crear el cliente (BD + usuario + .env + contenedor)
El script de la infra hace todo (crea BD+usuario en el Postgres compartido, genera
el `.env` del cliente con secretos, y levanta el contenedor con sus labels):
```bash
/opt/orway-infra/scripts/new-ayalas-client.sh <cliente> <dominio>
# ej:
/opt/orway-infra/scripts/new-ayalas-client.sh ayalas ayalas.orwaygroup.com
```
Esto deja el `.env` y el compose del cliente en
`/opt/orway-infra/apps/ayalas/clients/<cliente>/`. **Guarda los secretos** que
imprime.

### 3d. Provisión de datos (db push + seed, dentro del contenedor)
Ayalas usa **`db:push`** (no migraciones):
```bash
P="-p ayalas-<cliente> --project-directory /opt/orway-infra/apps/ayalas/clients/<cliente>"
docker compose $P exec app npm run db:push
docker compose $P exec app npm run db:seed   # crea el admin (ADMIN_* del .env)
```

---

## 4. Verificar
1. Que el DNS resuelva al VPS:  `nslookup <dominio>` → `2.24.217.100`.
2. `https://<dominio>` carga con candado válido (Let's Encrypt vía HTTP-01).
3. Login con el `ADMIN_EMAIL` / `ADMIN_PASSWORD` que generó el script.

Si el cert no sale: revisa `docker logs orway-infra-traefik-1 | tail` — casi siempre
es el DNS apuntando al CDN en vez de a `2.24.217.100`, o el rate-limit (espera 1 h).

---

## 5. Chatbot (n8n compartido)
Ayalas usa el **n8n compartido**. Crea el workflow del bot apuntando a
`https://<dominio>/api/bot/*` (contrato en `docs/n8n-bot-api.md` de este repo). Los
tokens de Meta/OpenAI van como **Credentials de n8n**, nunca en el `.env` ni en el código.

---

## 6. Actualizaciones y colaboración
- **Actualizar una instancia ya desplegada** (tras mergear código a `master`):
  ```bash
  cd /opt/ayalas && git pull
  docker build -t ayalas:latest .
  C="-p ayalas-<cliente> --project-directory /opt/orway-infra/apps/ayalas/clients/<cliente>"
  docker compose $C up -d            # recrea con la imagen nueva
  docker compose $C exec app npm run db:push   # si cambió el schema
  ```
  (Conviene encapsular esto en un `scripts/deploy.sh` del repo de Ayalas, como tiene
  Orway, con candado `flock` para no chocar entre dos personas.)
- **Regla de oro:** *si no está en `master`, no está en el VPS.* Push/merge a master
  primero, luego deploy.
- **Acceso de colaboradores sin root:** usuario propio + regla `sudo` acotada al
  `deploy.sh` (mismo patrón que se usó en Orway). NO meter colaboradores al grupo
  `docker` (es equivalente a root).

---

## 7. Diferencias clave vs Orway (para no confundir)
| | Orway System | Ayalas |
|---|---|---|
| Stack | Next 16 · Prisma 7 · RLS | Next 14 · Prisma 5 · iron-session |
| BD | 1 BD, **2 roles** (owner + app/RLS) | 1 BD, **1 usuario** por cliente |
| Esquema | `prisma migrate deploy` + `rls.sql` | `prisma db push` |
| Puerto interno | 3000 | 3001 |
| Instancias | 1 (negocio propio) | **N (una por gimnasio)** |
| Dominio | apex `orwaygroup.com` | subdominio por cliente |
