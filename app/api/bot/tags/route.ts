import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";
import { normalizeIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

// n8n llama aquí con los tags que el LLM eligió. Regla de diseño:
// SOLO se aplican tags que ya existen en el catálogo (curado) — el bot NO crea
// tags nuevos, para no ensuciar la segmentación. Los nombres desconocidos se
// ignoran y se reportan. Source = AUTO_LLM.
const schema = z.object({
  phone: z.string().min(1),
  plataforma: z.enum(["whatsapp", "messenger", "instagram"]).default("whatsapp"),
  tags: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(req: Request) {
  if (!checkBotKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { phone, plataforma, tags } = parsed.data;

  const identity = normalizeIdentity(phone, plataforma);
  const conversation = await prisma.whatsAppConversation.findUnique({
    where: { phone: identity },
    select: { id: true },
  });
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversación no encontrada" },
      { status: 404 },
    );
  }

  const names = [...new Set(tags.map((t) => t.trim()))];
  const found = await prisma.tag.findMany({
    where: { name: { in: names }, isActive: true },
    select: { id: true, name: true },
  });
  const foundNames = new Set(found.map((f) => f.name));
  const ignored = names.filter((n) => !foundNames.has(n));

  // upsert idempotente; si el tag ya estaba (p.ej. puesto MANUAL por el staff),
  // no lo pisamos — update vacío preserva el source original.
  await prisma.$transaction(
    found.map((t) =>
      prisma.conversationTag.upsert({
        where: {
          conversationId_tagId: {
            conversationId: conversation.id,
            tagId: t.id,
          },
        },
        update: {},
        create: {
          conversationId: conversation.id,
          tagId: t.id,
          source: "AUTO_LLM",
          appliedById: "system:bot",
        },
      }),
    ),
  );

  return NextResponse.json({
    ok: true,
    applied: found.map((f) => f.name),
    ignored,
  });
}
