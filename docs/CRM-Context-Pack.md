# CRM Multi-Canal — Context Pack (plantilla portable)

> **Para quien lee esto (Claude del compañero):** este documento describe 3 módulos de un CRM construido en **Next.js 14 (App Router) + Prisma + PostgreSQL**, para que los **re-implementes adaptados al codebase destino**. NO es copy-paste: adapta nombres de modelos, auth y rutas a lo que ya exista en el proyecto. Donde hay código, es referencia de estructura, no un drop-in.
>
> **Módulos cubiertos:** (1) Inbox multi-canal (WhatsApp/Instagram/Messenger), (2) Dashboard de métricas, (3) Marketing (campañas por tag).
> **Fuera de alcance** (mencionado solo como dependencia mínima): sistema completo de auto-tagging por LLM, módulo ARCO/compliance.

---

## 0. Supuestos de stack

- Next.js 14 App Router (`app/`), Server Route Handlers en `app/api/.../route.ts`.
- Prisma ORM + PostgreSQL.
- Auth: existe un guard server-side `requireAdmin(req)` que devuelve la sesión si el usuario es admin, o `null`. **Adapta esto a tu sistema de auth.** Todas las rutas CRM están detrás de ese guard.
- (Opcional pero recomendado) Row-Level Security: el proyecto origen usa un cliente Prisma con RLS vía `withApp(db => ...)` + `runWithSession(s, ...)`. Si tu destino no usa RLS, reemplaza `withApp`/`runWithSession` por tu cliente Prisma normal y filtra por tenant/owner en el `where` manualmente.

---

## 1. MODELO DE DATOS (Prisma)

### 1.1 Núcleo del Inbox

```prisma
model WhatsAppConversation {
  id        String            @id @default(cuid())
  phone     String            @unique   // identidad del usuario: teléfono (WhatsApp) o PSID/IGSID (Messenger/IG)
  userId    String?                      // opcional: vínculo a un User registrado
  user      User?             @relation(fields: [userId], references: [id], onDelete: SetNull)
  messages  WhatsAppMessage[]
  tags      ConversationTag[]
  updatedAt DateTime          @updatedAt
  createdAt DateTime          @default(now())

  @@index([updatedAt])
}

model WhatsAppMessage {
  id             String               @id @default(cuid())
  conversationId String
  conversation   WhatsAppConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  direction      MessageDirection
  body           String
  messageType    String               @default("text")
  mid            String?              @unique   // ID del mensaje en Meta (para tracking de borrado). NULL permitido.
  plataforma     String?              @default("whatsapp") // 'whatsapp' | 'messenger' | 'instagram'
  deletedAt      DateTime?            // soft-delete: cuando Meta avisa que el usuario borró el mensaje
  sentAt         DateTime
  createdAt      DateTime             @default(now())

  @@index([conversationId, sentAt])
  @@index([mid])
}

enum MessageDirection { INBOUND OUTBOUND }
```

### 1.2 Dependencia: Tags (mínimo para Inbox + Marketing)

> El sistema de tags es prerrequisito de Inbox (muestra tags por conversación) y Marketing (segmenta por tag). Incluye estos modelos. **El auto-tagging por LLM queda fuera de alcance** — por eso `TagSource` trae `MANUAL` como default; las variantes `AUTO_*` solo importan si luego agregas auto-tagging.

```prisma
model Tag {
  id            String            @id @default(cuid())
  name          String            @unique
  color         String            @default("slate") // token de color: slate|red|amber|green|blue|violet|pink
  description   String?
  isActive      Boolean           @default(true)
  conversations ConversationTag[]
  users         UserTag[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  @@index([isActive])
}

model ConversationTag {
  id             String               @id @default(cuid())
  conversationId String
  conversation   WhatsAppConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  tagId          String
  tag            Tag                  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  source         TagSource            @default(MANUAL)
  appliedAt      DateTime             @default(now())
  appliedById    String?              // sin FK formal: id del admin, o "system:..." o null
  @@unique([conversationId, tagId])
  @@index([tagId])
  @@index([conversationId])
}

model UserTag {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tagId       String
  tag         Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)
  source      TagSource @default(MANUAL)
  appliedAt   DateTime  @default(now())
  appliedById String?
  @@unique([userId, tagId])
  @@index([tagId])
  @@index([userId])
}

enum TagSource { MANUAL AUTO_RULE AUTO_LLM }
```

---

## 2. MÓDULO: INBOX MULTI-CANAL

### Qué hace
Bandeja unificada de conversaciones de WhatsApp + Instagram + Messenger. Lista de conversaciones (izquierda) + hilo de mensajes (derecha). Polling cada 5s. Badge de canal por conversación. Mensajes borrados por el usuario se muestran como "🚫 Este mensaje fue eliminado" (no desaparecen).

### Ingesta de mensajes (la fuente de datos)
Un orquestador externo (n8n, o webhook directo de Meta) llama a un endpoint que guarda cada interacción. **Punto crítico de diseño:**

```
POST /api/bot/messages   (header: x-bot-key: <BOT_API_KEY>)
body: { phone, inbound, outbound, messageType?, sentAt?, mid?, plataforma? }
```

Lógica del handler (puntos no-obvios, aprendidos en producción):

```ts
// 1) Identidad por plataforma — NO mutilar el ID de Messenger/IG.
function normalizeIdentity(raw: string, platform: string): string {
  const digits = raw.replace(/\D/g, "");
  if (platform === "messenger" || platform === "instagram") return digits; // PSID/IGSID COMPLETO
  // WhatsApp = teléfono: normaliza a 10 dígitos (ajusta a tu país)
  let d = digits;
  if (d.startsWith("521") && d.length === 13) d = d.slice(3);
  if (d.startsWith("52")  && d.length === 12) d = d.slice(2);
  return d.slice(-10);
}

// 2) Upsert de conversación por identidad + crear 2 mensajes (INBOUND + OUTBOUND del bot)
const conversation = await prisma.whatsAppConversation.upsert({
  where:  { phone: identity },
  update: {},
  create: { phone: identity },
});

// 3) skipDuplicates: Meta RE-ENTREGA webhooks seguido. Sin esto, un `mid`
//    repetido truena el createMany entero con 500 y el mensaje se pierde.
await prisma.whatsAppMessage.createMany({
  data: [
    { conversationId: conversation.id, direction: "INBOUND",  body: inbound,  mid, plataforma, sentAt: ts },
    { conversationId: conversation.id, direction: "OUTBOUND", body: outbound, plataforma, sentAt: new Date(ts.getTime()+1) },
  ],
  skipDuplicates: true,
});
```

### Soft-delete (cumplimiento Meta `instagram_manage_messages`)
Cuando Meta avisa que el usuario borró un mensaje, **no se borra la fila** — se vacía el body y se marca `deletedAt`. Así el CRM conserva el historial mostrando "mensaje eliminado", y se cumple con Meta (el contenido deja de almacenarse).

```
POST /api/bot/messages/delete-by-mid   (header x-bot-key)
body: { mid, sender?, plataforma? }
→ busca WhatsAppMessage por mid; UPDATE { body: "", deletedAt: new Date() }
→ idempotente: si no existe o ya estaba borrado, responde 200 con deleted:false
```

### API de lectura (consume el frontend)

```
GET /api/crm/whatsapp/conversations            → lista
  · orderBy updatedAt desc, take 100
  · cada row: { id, phone, userId, userName, lastMessage{body,direction,sentAt,deletedAt,plataforma}, messageCount, tags[], updatedAt }

GET /api/crm/whatsapp/conversations/[phone]    → hilo
  · messages orderBy sentAt asc, select incluye deletedAt + plataforma
  · incluye tags de la conversación (aplanados con source)
```

### Frontend (estructura)
- `CrmShell` — layout con sidebar de navegación (responsive: drawer en móvil) que envuelve todas las páginas `/crm/*`.
- `app/crm/whatsapp/page.tsx` — lista + hilo, polling 5s.
- Componentes reusables: `TagPill` (pastilla de tag con color + botón quitar), `TagPicker` (combobox buscar/crear tag).

**Decisiones de UI no-obvias:**
1. **Scroll inteligente** (estilo WhatsApp Web): el hilo solo auto-baja si el usuario YA estaba cerca del fondo; si está leyendo arriba, el refresh NO lo mueve. Se trackea con un ref `wasNearBottom` en el `onScroll` (umbral ~80px) y un ref de "conversación cambió" para saltar al fondo solo al abrir.
2. **Badge de plataforma** por conversación: mapea `lastMessage.plataforma` → `{label, color}` (whatsapp=verde #25d366, instagram=rosa #e1306c, messenger=azul #0084ff), default whatsapp para conversaciones viejas.
3. **Placeholder de borrado**: si `message.deletedAt`, renderiza "🚫 Este mensaje fue eliminado" en cursiva opacada, en vez del body.

---

## 3. MÓDULO: DASHBOARD DE MÉTRICAS

### Qué hace
Panel con KPIs (con % de crecimiento vs período anterior), gráfica de barras apiladas por período, donuts de conversión, y filtros (período / valor / días de la semana / origen).

> **Importante para adaptar:** este dashboard está atado al dominio "reservas de restaurante" (`Reservation`, `User`, `WhatsAppMessage`). Para tu plantilla, **reemplaza las entidades por las de tu negocio** (ej. pedidos, leads, tickets). Lo reusable es el **patrón**: cards con growth, stacked bar chart por buckets de tiempo, donuts de conversión, y el manejo de zona horaria.

### Contrato del endpoint

```
GET /api/crm/dashboard?period=month|year|week&value=<YYYY-MM|YYYY|YYYY-Www>&days=0,2,3,4,5,6&source=all|WHATSAPP|WEB

respuesta:
{
  cards: {
    users:        { value: number, growth: number },   // growth = % vs período anterior
    messages:     { value: number, growth: number },
    reservations: { value: number, growth: number },
  },
  chart: [ { label, completed, confirmed, noShow, cancelled } ],  // barras apiladas por día/mes
  conversion:        { pct, total, successful, cancelled },        // donut general
  whatsappConversion:{ pct, totalConversations, converted },       // donut por canal
}
```

### Patrones clave a replicar
- **Cálculo de crecimiento**: `pct(curr, prev) = prev===0 ? (curr>0?100:0) : round((curr-prev)/prev*100)`.
- **Buckets de tiempo**: según `period`, arma buckets (días del mes / 12 meses / días de semana) y agrupa registros por su fecha. Oculta buckets futuros solo si están vacíos.
- **Zona horaria explícita**: el servidor corre en UTC; deriva año/mes/día/DOW aplicando el offset de tu zona manualmente (helpers `mxParts`/`mxMidnight` en el origen usan UTC-6). **Adáptalo a tu TZ** o usa una librería (date-fns-tz / Luxon).
- **Filtro por día de la semana (DOW)**: permite excluir días (ej. el negocio cierra lunes).

### Frontend
- `app/crm/page.tsx`: `<StatCard>` (KPI + growth), `<Chart>` (barras apiladas SVG/div, sin librería de charting), `<Donut>` (SVG inline con `strokeDasharray`), `<Filters>` (pills de período/origen/días).
- **Gotcha móvil (importante):** la gráfica de barras debe tener **scroll horizontal interno** (`overflow-x:auto` + `grid-auto-flow:column` + `grid-auto-columns: minmax(26px,1fr)`), no `repeat(N,1fr)`. Con 20+ barras, `repeat(N,1fr)` hace la página más ancha que el celular y recorta TODO. El chart se desliza dentro de su panel; el resto queda fijo.

---

## 4. MÓDULO: MARKETING (CAMPAÑAS POR TAG)

### Qué hace
Crear campañas de mensajería masiva segmentadas por tag, con preview estilo WhatsApp, y envío vía plantillas aprobadas por Meta. Lista de campañas con progreso (enviadas/total) + página de creación con preview en vivo.

> **Estado en el origen:** el **frontend está completo**; el **backend es un mock** (`localStorage` + funciones marcadas `// TODO: replace with fetch`). Tu Claude debe implementar el backend real. La UI define exactamente el contrato que el backend necesita.

### ⚠️ Regla dura de WhatsApp (no negociable)
Para mensajes masivos a usuarios fuera de la ventana de 24h, Meta **obliga usar Template Messages pre-aprobados** (categoría MARKETING). Mandar texto libre masivo = suspensión del número. Las plantillas se crean y aprueban en Meta Business Manager (24-48h), tienen variables `{{1}}`, `{{2}}`.

### Tipos (contrato)

```ts
type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
type TagFilterSource = "conv" | "user" | "both";   // segmentar por tags de chat, de usuario, o ambos
type TagFilterMode   = "any" | "all";              // OR / AND entre tags

interface MetaTemplate {
  name: string; category: "MARKETING"|"UTILITY"; language: string; status: "APPROVED"|"PENDING"|"REJECTED";
  bodyText: string;                 // con {{1}}, {{2}}...
  headerType?: "IMAGE"|"VIDEO"|"TEXT"; headerExample?: string;
  variables: { index: number; example: string; label: string }[];
  buttons?: { type: "URL"|"QUICK_REPLY"; text: string; url?: string }[];
}

interface MarketingCampaign {
  id: string; name: string;
  templateName: string; templateLanguage: string; templateParams: Record<string,string>;
  headerImageUrl?: string|null;
  filters: { tagIds: string[]; mode: TagFilterMode; source: TagFilterSource };
  status: CampaignStatus;
  scheduledAt: string|null; startedAt: string|null; completedAt: string|null;
  totalTargets: number; sentCount: number; failedCount: number;
  createdAt: string; updatedAt: string;
}
```

### Endpoints que el backend debe exponer (a implementar)

```
GET   /api/crm/marketing/templates            → plantillas aprobadas (cachear de Meta o config)
GET   /api/crm/marketing/campaigns            → lista con progreso
POST  /api/crm/marketing/campaigns            → crear DRAFT
POST  /api/crm/marketing/campaigns/[id]/preview → cuenta destinatarios SIN enviar (clave: ver alcance antes de gastar)
POST  /api/crm/marketing/campaigns/[id]/send    → dispara envío
POST  /api/bot/marketing/callback             → el worker (n8n) reporta resultado por destinatario
```

### Modelo de datos sugerido para el backend

```prisma
model MarketingCampaign {
  id String @id @default(cuid())
  name String
  templateName String
  templateLanguage String @default("es_MX")
  templateParams Json?
  headerImageUrl String?
  filters Json     // { tagIds, mode, source }
  status String @default("DRAFT")
  scheduledAt DateTime? ; startedAt DateTime? ; completedAt DateTime?
  totalTargets Int @default(0) ; sentCount Int @default(0) ; failedCount Int @default(0)
  targets MarketingCampaignTarget[]
  createdAt DateTime @default(now())
}
model MarketingCampaignTarget {
  id String @id @default(cuid())
  campaignId String
  campaign MarketingCampaign @relation(fields:[campaignId], references:[id], onDelete:Cascade)
  phone String              // identidad destino (teléfono o PSID)
  conversationId String? ; userId String?
  status String @default("PENDING")   // PENDING|SENT|FAILED|SKIPPED
  errorMessage String? ; sentAt DateTime? ; mid String?
  @@index([campaignId, status])
}
```

### Resolución de destinatarios (lógica del preview/send)
Dado `filters {tagIds, mode, source}`:
- `source = "conv"` → conversaciones con esos `ConversationTag`.
- `source = "user"` → usuarios con esos `UserTag` (requieren teléfono).
- `source = "both"` → unión, **deduplicada por teléfono**.
- `mode = "any"` → tiene al menos uno de los tags (OR). `mode = "all"` → tiene todos (AND).

### Frontend
- `app/crm/marketing/page.tsx`: lista de campañas (tabla con badge de status + barra de progreso) + empty state.
- `app/crm/marketing/nueva/page.tsx`: form (nombre → template → variables → imagen header → tags+filtros → programar) con **preview WhatsApp en vivo** en columna derecha sticky.
- Componentes: `WhatsAppPreview` (burbuja con header imagen + body con variables sustituidas + botones), `TagMultiSelector` (reusa TagPicker/TagPill).

### Patrón de envío recomendado (worker)
Backend marca targets PENDING → un worker (n8n o cron) consume en lotes de ~50, manda cada template vía Meta Graph API con delay (~1s, rate limit), y reporta a `/api/bot/marketing/callback` (SENT+mid, o FAILED+error). Así es reanudable si el worker se cae.

---

## 5. DEPENDENCIAS EXTERNAS + ENV VARS

```
DATABASE_URL=postgresql://...
BOT_API_KEY=<secreto compartido entre el orquestador (n8n) y los endpoints /api/bot/*>
WHATSAPP_ACCESS_TOKEN=<token de Meta — VER GOTCHA #1>
WHATSAPP_PHONE_NUMBER_ID=<id del número de WhatsApp Business>
# OPENAI_API_KEY=  (solo si agregan auto-tagging por LLM — fuera de alcance)
```

- **Meta WhatsApp Business Cloud API** (Graph API): usar **v25.0** (consistente; las versiones viejas se deprecan ~2 años). Envío vía `POST graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages`.
- **Orquestador** (n8n o equivalente): recibe el webhook de Meta y llama a `/api/bot/*`. Los tokens de Meta/OpenAI deben vivir como **Credentials del orquestador, NUNCA hardcodeados** en el flujo.

---

## 6. GOTCHAS APRENDIDOS EN PRODUCCIÓN (no los repitan)

1. **🔴 El token de Meta DEBE ser de System User (permanente).** Los tokens temporales expiran (24h/60d) y rompen TODO el envío en silencio (recibir sigue funcionando, enviar no) → síntoma: error Meta **code 190 "Session has expired"**. En el origen esto tumbó el envío 2.5 meses sin que se notara. Genera el token en Business Settings → System Users → caducidad "Nunca", permisos `whatsapp_business_messaging`.
2. **No mutilar el PSID/IGSID** de Messenger/Instagram con lógica de teléfono. Usar el ID completo como llave de conversación (`normalizeIdentity`).
3. **`mid @unique` + `createMany({skipDuplicates:true})`** — Meta re-entrega webhooks; sin skipDuplicates un mid repetido tira 500 y pierde el mensaje.
4. **Soft-delete, no hard-delete** de mensajes borrados — conserva historial + cumple Meta.
5. **Gráficas en móvil con scroll interno**, no `repeat(N,1fr)` (rompe el ancho de toda la página).
6. **Validar contraste/legibilidad** y que ningún elemento desborde su contenedor en móvil.

---

## 7. ORDEN DE IMPLEMENTACIÓN SUGERIDO

1. **Schema**: agrega los modelos (sección 1) a tu `schema.prisma`, adapta la relación a tu `User`. `prisma migrate`/`db push`.
2. **Auth guard**: confirma tu `requireAdmin` (o equivalente) y mete las rutas CRM detrás.
3. **Ingesta** (`/api/bot/messages` + `delete-by-mid`) — sin esto el inbox no tiene datos.
4. **Inbox** (API de lectura + página) — el módulo más autocontenido, arranca por aquí.
5. **Tags** (CRUD mínimo `/api/crm/tags` + TagPicker/TagPill) — necesario para inbox y marketing.
6. **Dashboard** — adapta las métricas a tus entidades de negocio.
7. **Marketing** — UI primero (define el contrato), luego backend + worker de envío.

> Pídele a tu Claude que implemente UN módulo a la vez, valide (`tsc` + correr la app) y commitee antes del siguiente. No todo de un jalón.

---

*Generado como plantilla portable. Origen: CRM de SanLuca (Next.js 14 + Prisma + Postgres). Adapta nombres, auth y dominio al codebase destino.*
