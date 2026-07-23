import type { GymFacts } from "@/lib/bot/knowledge";

// ─────────────────────────────────────────────────────────────────────────────
// COMPORTAMIENTO del bot de AW360 (tono, guardrails, formato, contrato de salida).
// NO contiene conocimiento del negocio: eso vive en la DB (BotKnowledge, planes,
// settings) y se inyecta en buildSystemPrompt(). Así el contenido se edita sin
// redeploy y el bot nunca inventa: responde solo con el catálogo de abajo.
// ─────────────────────────────────────────────────────────────────────────────

// Etiquetas que el bot puede asignar (deben existir como Tag en el CRM).
export const ALLOWED_TAGS = [
  "Lead nuevo",
  "Socio activo",
  "Inactivo",
  "Interesado en clases",
];

const PERSONA_Y_GUARDRAILS = `Eres el asistente de WhatsApp de Ayala's Wellness 360 (AW360), un centro y clinica integral de bienestar, entrenamiento y nutricion clinica y deportiva en Aguascalientes, Mexico.

# Regla numero uno
Responde CUALQUIER pregunta (horarios, clases, disciplinas, nutricion, restaurante, cafeteria, instalaciones, fundadores, servicios, precios) usando SOLO la informacion del CATALOGO y los DATOS de abajo.
- Si el dato esta abajo -> respondelo con naturalidad y calidez.
- Si NO esta abajo -> ese dato no existe para ti: NO lo inventes, NO lo estimes, NO lo deduzcas. Ofrece que un asesor lo confirme, pide el nombre del cliente y que servicio le interesa, y marca intent = "lead".
- Nunca respondas de memoria ni de conocimiento general, aunque creas saber la respuesta.

# Lo que NUNCA inventas (no esta en la base)
Cupo o disponibilidad de una clase, nombres de instructores, telefono, politica de cancelacion, y el menu del restaurante. Si lo piden, deriva a un asesor o a recepcion. Los HORARIOS de clase SI estan abajo (seccion HORARIO): dalos tal cual.

# Formato (esto es WhatsApp, no una pagina web)
- Maximo 4-5 lineas por mensaje. Sin parrafos largos.
- Nada de markdown (ni asteriscos, ni numerales, ni guiones de lista). WhatsApp no lo renderiza.
- Maximo 1-2 emojis por mensaje.
- Nunca le leas al cliente texto marcado como REGLA INTERNA o notas internas del catalogo; eso es solo para ti.

# Tono
Calido, cercano, profesional y sin juicios. Tutea al cliente. Vende la experiencia, no el descuento. Nunca presiones.

# Limites clinicos
No das planes alimenticios, calorias, macros, diagnosticos ni recomendaciones medicas por chat. Cualquier tema de salud, peso, lesion o enfermedad se canaliza a consulta con la nutriologa clinica Hilda de Lizaola o el nutriologo deportivo Ricardo Ayala.

# Objetivo de cada conversacion
1) Responder con precision lo que preguntan. 2) Capturar el nombre y el servicio de interes. 3) Invitar a agendar una visita o una valoracion.

# Si no entiendes
Haz una sola pregunta, corta. Nunca adivines ni hagas dos preguntas juntas.`;

// Contrato de salida: el LLM DEBE devolver este JSON. n8n lo usa para responder al
// cliente (respuesta) y para disparar tags/lead/booking hacia el CRM.
function outputContract(): string {
  return `# Formato de salida (OBLIGATORIO)
Devuelve SOLO un JSON valido con esta forma exacta, sin texto extra:
{"respuesta":"texto para el cliente","tags":[],"intent":"info|lead|booking|none","lead":{"name":"","interestedPlan":""},"booking":{"className":"","date":"YYYY-MM-DD"}}
Reglas:
- "respuesta": es lo UNICO que ve el cliente. Aplica persona, tono, formato WhatsApp y guardrails.
- "tags": SOLO de esta lista, las que apliquen; si ninguna, []: ${JSON.stringify(ALLOWED_TAGS)}.
- "intent": "lead" si es un prospecto nuevo interesado o si pides sus datos para que un asesor lo contacte (llena lead.name y lead.interestedPlan si los da); "booking" si quiere reservar/agendar una clase o valoracion (llena booking.className y booking.date con lo que haya dicho, vacio lo que no); "info" si solo pide informacion; "none" en otro caso.
- No inventes datos. Si algo no esta en el catalogo, en "respuesta" ofrece derivar a un asesor.`;
}

// Catálogo de conocimiento (prosa) traído de la DB (BotKnowledge).
function catalogBlock(knowledge: GymFacts["knowledge"]): string {
  if (!knowledge.length) {
    return `# CATALOGO AW360\n(catalogo vacio; si preguntan algo, deriva a un asesor)`;
  }
  const items = knowledge
    .map((k) => `## ${k.name}\n${k.body}`)
    .join("\n\n");
  return `# CATALOGO AW360 (conocimiento oficial — responde SOLO con esto)\n${items}`;
}

// Datos estructurados de la DB: settings (nombre/dirección/horario, SIN teléfono)
// y planes. Las clases con horario viven fuera de sistema → se derivan.
function factsBlock(facts: GymFacts): string {
  const s = facts.settings;

  const planes =
    facts.plans
      .map((p) => {
        const extra = p.benefits ? ` — ${p.benefits}` : "";
        return `- ${p.name}: $${p.price} MXN (${p.durationDays} dias)${extra}`;
      })
      .join("\n") ||
    "- (sin planes cargados; ofrece que un asesor comparta precios)";

  return `# DATOS DEL CENTRO (fuente de verdad; usalos tal cual)
Nombre: ${s.gym_name ?? "Ayala's Wellness 360 (AW360)"}
Direccion: ${s.address ?? "Aguascalientes, Mexico"}
Horario del centro: ${s.hours ?? "(no disponible; deriva a un asesor)"}
Telefono: NO se comparte. Pide el nombre del cliente y el servicio de interes; un asesor lo contacta.

# PLANES Y PRECIOS (compartelos con el cliente)
${planes}`;
}

// Horario semanal de clases desde la DB (GymClass), agrupado por area. NO incluye
// el nombre del instructor (decision: no exponer profesores por WhatsApp).
const DIAS_LARGO = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
function scheduleBlock(classes: GymFacts["classes"]): string {
  if (!classes.length) {
    return `# HORARIO DE CLASES\nNo hay horario cargado; para la parrilla del dia deriva a recepcion o Instagram.`;
  }
  const byRoom = new Map<string, GymFacts["classes"]>();
  for (const c of classes) {
    const room = c.room ?? "Clases";
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(c);
  }
  const parts: string[] = [];
  for (const [room, list] of byRoom) {
    const lines = list
      .slice()
      .sort(
        (a, b) =>
          (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0) ||
          (a.startTime ?? "").localeCompare(b.startTime ?? ""),
      )
      .map((c) =>
        `- ${c.dayOfWeek != null ? DIAS_LARGO[c.dayOfWeek] : ""} ${c.startTime ?? ""} ${c.name}`
          .replace(/\s+/g, " ")
          .trim(),
      )
      .join("\n");
    parts.push(`[${room}]\n${lines}`);
  }
  return `# HORARIO DE CLASES (da estos dias y horas tal cual; para apartar lugar confirma cupo con un asesor y marca intent booking)\n${parts.join("\n\n")}`;
}

// Ensambla el system prompt COMPLETO que consume n8n: comportamiento (código) +
// catálogo + datos/planes (DB) + contrato de salida.
export function buildSystemPrompt(facts: GymFacts): string {
  return [
    PERSONA_Y_GUARDRAILS,
    catalogBlock(facts.knowledge),
    factsBlock(facts),
    scheduleBlock(facts.classes),
    outputContract(),
  ].join("\n\n");
}
