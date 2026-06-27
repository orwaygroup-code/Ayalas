# Ayalas — API para n8n (endpoints del bot)

Contrato de los endpoints que **n8n** debe llamar en el CRM. n8n es el orquestador:
recibe el webhook de Meta (WhatsApp/Instagram/Messenger), maneja la verificación de
Meta y la llamada al LLM, y usa estos endpoints para guardar/leer datos en el CRM.

> El CRM **no** recibe webhooks de Meta directamente. Toda la integración con Meta
> (verificación, recepción, envío) vive en n8n. El token de Meta y el de OpenAI son
> **Credentials de n8n**, nunca van al CRM.

---

## Autenticación y base

- **Todos** los endpoints `/api/bot/*` requieren el header:
  ```
  x-bot-key: <BOT_API_KEY>
  ```
  (mismo valor que la variable `BOT_API_KEY` del `.env` del CRM; pedírselo a quien
  administra el CRM, va como Credential en n8n).
- `Content-Type: application/json` en los POST.
- **Base URL:**
  - Dev: `http://localhost:3001`
  - Prod: `https://<dominio-del-cliente>` (cuando esté en el VPS)
- Sin el header correcto → `401`. Body inválido → `400`.

### Identidad del contacto (importante)
Manda el identificador **crudo**; el CRM lo normaliza:
- **WhatsApp** → teléfono (el CRM lo normaliza a 10 dígitos, formato MX).
- **Messenger / Instagram** → **PSID/IGSID completo, sin recortar** (no le quites nada).

El campo siempre se llama `phone` y `plataforma` indica el canal
(`whatsapp` | `messenger` | `instagram`, default `whatsapp`).

---

## 1. Guardar interacción — `POST /api/bot/messages`

Llamar por **cada** intercambio (lo que escribió el usuario y/o lo que respondió el bot).

| Campo | Tipo | Req | Notas |
|-------|------|-----|-------|
| `phone` | string | ✅ | identidad (ver arriba) |
| `inbound` | string | ⚠️ | mensaje del usuario |
| `outbound` | string | ⚠️ | respuesta del bot |
| `plataforma` | enum | — | `whatsapp`\|`messenger`\|`instagram` (default whatsapp) |
| `mid` | string | — | id del mensaje en Meta (del **inbound**). Clave para no duplicar. |
| `messageType` | string | — | default `"text"` |
| `sentAt` | string ISO | — | default = ahora |

⚠️ Debe venir al menos uno de `inbound` / `outbound`.

```bash
curl -X POST $BASE/api/bot/messages \
  -H "x-bot-key: $KEY" -H "Content-Type: application/json" \
  -d '{"phone":"5215512345678","inbound":"Hola, info de planes?","outbound":"¡Hola! Tenemos Mensual, Trimestral y Anual.","plataforma":"whatsapp","mid":"wamid.XXX"}'
```
Respuesta: `{ "ok": true, "conversationId": "...", "identity": "5512345678", "inserted": 2 }`
Reenvío con el mismo `mid` → `{ "ok": true, "inserted": 0, "duplicate": true }` (idempotente; Meta re-entrega webhooks).

---

## 2. Mensaje borrado — `POST /api/bot/messages/delete-by-mid`

Cuando Meta avisa que el usuario borró un mensaje. Soft-delete (conserva historial).

| Campo | Tipo | Req |
|-------|------|-----|
| `mid` | string | ✅ |
| `sender` / `plataforma` | string | — |

Respuesta: `{ "ok": true, "deleted": true }` (o `deleted:false` si no existía / ya estaba borrado — idempotente).

---

## 3. Capturar lead — `POST /api/bot/leads`

Cuando el LLM detecta un prospecto y extrae datos.

| Campo | Tipo | Req | Notas |
|-------|------|-----|-------|
| `phone` | string | ✅ | identidad |
| `plataforma` | enum | — | default whatsapp |
| `name` | string | — | |
| `email` | string | — | |
| `source` | string | — | default = `plataforma` |
| `interestedPlan` | string | — | **nombre** del plan (ej. `"Mensual"`); si no existe se ignora |
| `notes` | string | — | |

Respuesta: `{ "ok": true, "leadId": "..." }`.
Si el teléfono **ya es socio** → `{ "ok": true, "isMember": true, "memberId": "..." }` (no crea lead).

---

## 4. Info para responder — `GET /api/bot/info`

Base de conocimiento para inyectar en el prompt del LLM (Info 24/7). Conviene cachearla
en n8n y refrescar cada cierto tiempo.

```bash
curl -H "x-bot-key: $KEY" $BASE/api/bot/info
```
```json
{
  "settings": { "gym_name": "...", "address": "...", "hours": "...", "phone": "...", "welcome_message": "..." },
  "plans":   [ { "name": "Mensual", "price": 600, "durationDays": 30, "benefits": "..." } ],
  "classes": [ { "name": "Spinning", "instructor": "...", "room": "...", "capacity": 20, "dayOfWeek": 1, "startTime": "07:00", "durationMin": 60 } ]
}
```
`dayOfWeek`: 0=domingo … 6=sábado.

---

## 5. Disponibilidad de clases — `GET /api/bot/classes`

- Sin parámetros → catálogo de clases activas.
- `?date=YYYY-MM-DD` → clases de **ese día de la semana** con `spotsLeft` (cupos libres).

```bash
curl -H "x-bot-key: $KEY" "$BASE/api/bot/classes?date=2026-06-29"
```
```json
{ "date": "2026-06-29", "classes": [ { "id": "...", "name": "Spinning", "startTime": "07:00", "capacity": 20, "spotsLeft": 18 } ] }
```

---

## 6. Reservar clase — `POST /api/bot/bookings`

| Campo | Tipo | Req | Notas |
|-------|------|-----|-------|
| `phone` | string | ✅ | identidad |
| `plataforma` | enum | — | |
| `date` | string | ✅ | `YYYY-MM-DD` (día de la sesión) |
| `classId` **o** `className` | string | ✅ | uno de los dos |
| `name` | string | — | para crear al invitado si aplica |

**Regla de negocio:** un no-socio puede tomar **1 clase muestra** (se crea como `INVITADO`);
para reservas futuras debe hacerse socio. Socio `ACTIVO` reserva normal.

Respuesta OK: `{ "ok": true, "bookingId": "...", "isTrial": false, "spotsLeft": 17, "message": "¡Listo! Reservé tu lugar en Spinning." }`

Rechazos (HTTP **200** con `ok:false` — usar `reason` para ramificar en n8n, y `message` para responderle al usuario):
| `reason` | Significado |
|----------|-------------|
| `FULL` | clase llena |
| `MEMBERSHIP_REQUIRED` | ya usó su clase muestra / membresía cancelada |
| `FROZEN` | membresía congelada |

Errores: `404` clase no encontrada · `400` body inválido.

---

## 7. Aplicar auto-tags — `POST /api/bot/tags`

Para que el LLM etiquete la conversación. **Solo** aplica tags que ya existen en el
catálogo (curado); los nombres desconocidos se ignoran (no inventa tags).

| Campo | Tipo | Req | Notas |
|-------|------|-----|-------|
| `phone` | string | ✅ | identidad |
| `plataforma` | enum | — | |
| `tags` | string[] | ✅ | **nombres** de tags del catálogo |

Respuesta: `{ "ok": true, "applied": ["Lead nuevo"], "ignored": ["XYZ"] }`.
No pisa tags puestos manualmente por el staff. `404` si la conversación no existe (primero guarda el mensaje con el endpoint #1).

---

## 8. Callback de marketing — `POST /api/bot/marketing/callback`

El worker de envío (n8n) reporta el resultado de cada destinatario tras intentar el
envío vía Meta.

| Campo | Tipo | Req |
|-------|------|-----|
| `campaignId` | string | ✅ |
| `phone` | string | ✅ |
| `status` | enum | ✅ (`SENT`\|`FAILED`\|`SKIPPED`) |
| `mid` | string | — |
| `error` | string | — |

Respuesta: `{ "ok": true, "sent": 7, "failed": 1, "pending": 0, "total": 8 }`. Cuando `pending` llega a 0, la campaña se marca `COMPLETED`.

> ⚠️ **Pendiente para el worker de marketing:** todavía **no** existe un endpoint para que
> n8n *obtenga* la lista de destinatarios `PENDING` de una campaña (el CRM los crea al
> presionar "Enviar", pero no hay un `GET` que los entregue). Si van a implementar el
> envío masivo ya, hay que agregar `GET /api/bot/marketing/pending?campaignId=...`. Avísame
> y lo construyo. (El flujo del bot conversacional —#1 a #7— no depende de esto.)

---

## Secuencia típica en n8n (mensaje entrante)

1. Llega webhook de Meta → n8n.
2. (Opcional, cacheado) `GET /api/bot/info` para el contexto del gym.
3. LLM (OpenAI) genera respuesta + tags + intención, con structured output:
   `{ respuesta, tags[], intent }`.
4. Enviar `respuesta` al usuario vía Meta (Graph API v25.0).
5. `POST /api/bot/messages` con `inbound` + `outbound` + `mid`.
6. `POST /api/bot/tags` con los `tags` del catálogo.
7. Según intención:
   - prospecto → `POST /api/bot/leads`
   - quiere clase → `GET /api/bot/classes?date=…` y `POST /api/bot/bookings`
8. Si Meta avisa borrado → `POST /api/bot/messages/delete-by-mid`.

---

## Variables de entorno del CRM (referencia)
```
BOT_API_KEY=<clave compartida con n8n>     # la que va en x-bot-key
DATABASE_URL=postgresql://...
# Meta y OpenAI NO van aquí — son Credentials de n8n.
```

GOTCHA Meta (recordatorio): el token de WhatsApp debe ser de **System User permanente**
(caducidad "Nunca"); los temporales rompen el envío en silencio (error 190). Graph API **v25.0**.
