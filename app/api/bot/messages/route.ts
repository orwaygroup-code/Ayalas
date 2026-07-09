import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";
import { normalizeIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

// Lo que manda el orquestador (n8n) por cada interacción del bot.
// inbound = lo que escribió el usuario; outbound = lo que respondió el bot.
// Al menos uno de los dos debe venir.
const schema = z
  .object({
    phone: z.string().min(1),
    inbound: z.string().optional(),
    outbound: z.string().optional(),
    messageType: z.string().optional(),
    sentAt: z.string().datetime().optional(), // ISO; default = ahora
    mid: z.string().optional(), // id del mensaje del usuario en Meta
    plataforma: z
      .enum(["whatsapp", "messenger", "instagram"])
      .default("whatsapp"),
  })
  .refine((d) => Boolean(d.inbound?.trim() || d.outbound?.trim()), {
    message: "Se requiere al menos inbound u outbound",
  });

export async function POST(req: Request) {
  if (!checkBotKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { phone, inbound, outbound, messageType, sentAt, mid, plataforma } =
    parsed.data;

  const identity = normalizeIdentity(phone, plataforma);
  const ts = sentAt ? new Date(sentAt) : new Date();

  // Upsert de la conversación por identidad. No tocamos member/lead aquí:
  // la captura/vinculación de Lead es Fase 4.
  const conversation = await prisma.whatsAppConversation.upsert({
    where: { phone: identity },
    update: { updatedAt: ts },
    create: { phone: identity },
  });

  // GOTCHA #3 (extendido): Meta re-entrega el webhook completo. El `mid` del
  // mensaje entrante identifica el evento; si ya existe, es un reenvío y NO
  // insertamos nada — ni el INBOUND (lo frena skipDuplicates) ni el OUTBOUND
  // (mid null, no colisiona) → así no se duplica la respuesta del bot.
  if (mid) {
    const dup = await prisma.whatsAppMessage.findUnique({
      where: { mid },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({
        ok: true,
        conversationId: conversation.id,
        identity,
        inserted: 0,
        duplicate: true,
      });
    }
  }

  // Arma las filas a insertar (solo las que existen).
  const rows = [];
  if (inbound?.trim()) {
    rows.push({
      conversationId: conversation.id,
      direction: "INBOUND" as const,
      body: inbound,
      messageType: messageType ?? "text",
      mid: mid ?? null,
      plataforma,
      sentAt: ts,
    });
  }
  if (outbound?.trim()) {
    rows.push({
      conversationId: conversation.id,
      direction: "OUTBOUND" as const,
      body: outbound,
      messageType: "text",
      mid: null, // el mid de Meta es del mensaje entrante del usuario
      plataforma,
      // +1ms para que el OUTBOUND quede después del INBOUND al ordenar por sentAt
      sentAt: new Date(ts.getTime() + 1),
    });
  }

  // GOTCHA #3: skipDuplicates — Meta re-entrega webhooks; sin esto un `mid`
  // repetido tira el createMany entero con 500 y se pierde el mensaje.
  const result = await prisma.whatsAppMessage.createMany({
    data: rows,
    skipDuplicates: true,
  });

  // Auto-lead: TODO contacto entrante que no sea socio queda como Lead NUEVO
  // desde su primer mensaje (decisión de producto — el dashboard se llena desde
  // la primera interacción, no solo cuando el LLM detecta intención de compra).
  // Best-effort: nunca rompe la ingesta del mensaje si algo falla aquí.
  let leadId: string | undefined;
  if (inbound?.trim()) {
    try {
      const member = await prisma.member.findUnique({
        where: { phone: identity },
        select: { id: true },
      });
      if (member) {
        // Ya es socio → no es lead; solo enlazamos la conversación al socio.
        if (!conversation.memberId) {
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: { memberId: member.id },
          });
        }
      } else {
        // Crea el lead si no existe (idempotente por teléfono). No pisa datos
        // ya capturados por el bot (name/plan) en contactos posteriores.
        const lead = await prisma.lead.upsert({
          where: { phone: identity },
          update: {},
          create: { phone: identity, source: plataforma, status: "NUEVO" },
        });
        leadId = lead.id;
        if (!conversation.leadId) {
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: { leadId: lead.id },
          });
        }
      }
    } catch {
      // El registro del mensaje ya se guardó; el lead es secundario.
    }
  }

  return NextResponse.json({
    ok: true,
    conversationId: conversation.id,
    identity,
    inserted: result.count,
    leadId,
  });
}
