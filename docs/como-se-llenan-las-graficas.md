# Cómo se llenan las gráficas del CRM (Ayalas)

Instructivo corto: **qué tiene que pasar en WhatsApp** para que el Dashboard y las
secciones del CRM dejen de estar en cero.

> ⚠️ Regla de oro: **las gráficas del Dashboard se alimentan de LEADS, no de mensajes.**
> Aunque lleguen 100 WhatsApps, si ninguno se convierte en *lead*, el embudo sigue en cero.

---

## 1. Qué alimenta cada cosa

| Sección del CRM | Se llena con | Quién lo dispara |
|---|---|---|
| **Inbox (WhatsApp)** | cada mensaje que entra/sale | El bot, en **todos** los mensajes |
| **Leads** (lista) | prospectos captados | El bot, cuando detecta interés |
| **Dashboard** (embudo, donut, "leads por día") | registros de **Lead** | El bot crea el lead **NUEVO**; el staff mueve el resto |
| **Socios** | miembros | Reserva de clase muestra, o alta manual del staff |

---

## 2. El ciclo de vida de un Lead (esto es lo importante)

```
WhatsApp (primer mensaje) → Lead NUEVO (automático) ──► el staff lo trabaja en el CRM
                                                         │
                                          ┌──────────────┼───────────────┐
                                        CONTACTADO    CONVERTIDO       PERDIDO
                                        (staff)       (staff)          (staff)
```

- **Todo primer contacto entrante se registra como Lead `NUEVO` automáticamente**
  (desde el primer WhatsApp, sin importar qué diga). La única excepción: si el número
  **ya es socio**, no se crea lead (se enlaza al socio).
- **`CONTACTADO`, `CONVERTIDO`, `PERDIDO` los pone el staff a mano** en el CRM
  (sección **Leads** → cambiar estado). Por eso el **donut de conversión** y la barra
  de "Convertidos" **no suben solos**: dependen de que tu equipo trabaje los leads.

---

## 3. Qué crea / enriquece un Lead

**Crear el lead (estado `NUEVO`):** ocurre **en el primer mensaje entrante**, siempre.
Cualquiera de estos ya lo crea:
- "Hola, me interesa inscribirme, ¿qué planes tienen?"
- "¿A qué hora abren?"
- "Gracias" / "ok" (sí, hasta esto crea lead — es un contacto nuevo)

**Enriquecer el lead:** cuando la IA detecta intención de compra (`intent = lead`),
además **le agrega nombre y plan de interés** al lead que ya existe. Por eso conviene
que el bot **pida el nombre** ("¿Cómo te llamas para agendarte?") — no cambia si hay
lead o no, pero un lead con nombre y plan vale mucho más que uno anónimo.

> ⚠️ Contrapartida de esta decisión: como **todo** contacto es lead, tu **% de conversión
> se diluye** (el denominador incluye números equivocados, spam y "holas" sueltos).
> El staff debe marcar esos como **PERDIDO** para que la conversión refleje la realidad.

---

## 4. Cómo sube CADA gráfica (receta concreta)

| Gráfica / número | Sube cuando… |
|---|---|
| **Leads totales** | entra el **primer mensaje** de un número nuevo (no socio) |
| **Nuevos este mes** | ese primer contacto ocurrió dentro del mes actual |
| **Leads por día (30 días)** | por cada día que llega al menos un contacto nuevo |
| **Embudo → NUEVO** | primer contacto entrante (automático) |
| **Embudo → CONTACTADO** | el **staff** cambia el lead a "Contactado" en el CRM |
| **Embudo → CONVERTIDO / Donut / "Convertidos"** | el **staff** marca el lead como "Convertido" |
| **Embudo → PERDIDO** | el **staff** marca el lead como "Perdido" |
| **Conversión %** | = Convertidos ÷ Total → sube al marcar leads como convertidos |

---

## 5. Otras secciones (no son "gráficas" pero se llenan igual)

- **Inbox:** se llena con **cualquier** mensaje. Es lo primero que verás con vida.
- **Socios:** un contacto se vuelve socio cuando **reserva una clase muestra**
  (queda como `INVITADO`) o cuando el staff lo da de alta / lo convierte.
- **Reservas de clase:** el prospecto pide reservar ("quiero la clase de spinning el
  lunes"); si hay cupo, el bot la agenda.

---

## 6. Prueba rápida para "encender" el dashboard

Manda estos WhatsApp reales al número del gym (desde otro teléfono):

1. **"Hola, me interesa inscribirme. ¿Qué planes manejan? Soy Carlos."**
   → debe crear **Lead NUEVO "Carlos"** + aparecer en Inbox.
2. Entra al CRM → **Leads** → abre a Carlos → cámbialo a **CONVERTIDO**.
   → el **donut** y "Convertidos" suben; la **Conversión %** deja de ser 0.
3. Repite con 2-3 mensajes más para ver el embudo con volumen.

> Recuerda: sin el paso 2 (staff moviendo el estado), el donut se queda en 0% aunque
> tengas muchos leads. **La conversión es trabajo del equipo, no del bot.**

---

## Resumen en una línea

**Cada primer WhatsApp de un número nuevo crea un Lead NUEVO automáticamente (el tope del
embudo se llena solo); el staff trabaja esos leads en el CRM y eso es lo que mueve la
conversión.**
