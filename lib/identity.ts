/**
 * Identidad de una conversación por plataforma.
 *
 * GOTCHA #2: NO mutilar el PSID/IGSID de Messenger/Instagram con lógica de
 * teléfono. Esos IDs son la llave de la conversación tal cual los manda Meta.
 * Solo WhatsApp se normaliza a teléfono (10 dígitos, formato MX).
 */
export type Plataforma = "whatsapp" | "messenger" | "instagram";

export function normalizeIdentity(raw: string, plataforma: Plataforma): string {
  const digits = raw.replace(/\D/g, "");

  // Messenger / Instagram: PSID/IGSID COMPLETO, sin recortar.
  if (plataforma === "messenger" || plataforma === "instagram") {
    return digits || raw.trim();
  }

  // WhatsApp = teléfono. Normaliza a 10 dígitos (MX: quita 521/52 de lada).
  let d = digits;
  if (d.startsWith("521") && d.length === 13) d = d.slice(3);
  else if (d.startsWith("52") && d.length === 12) d = d.slice(2);
  return d.slice(-10);
}
