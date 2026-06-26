import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Meta avisa (webhook) que el usuario borró un mensaje. Lo identifica por `mid`.
const schema = z.object({
  mid: z.string().min(1),
  sender: z.string().optional(),
  plataforma: z.string().optional(),
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

  const { mid } = parsed.data;

  // GOTCHA #4: SOFT-delete, no hard-delete. Vaciamos el body y marcamos
  // deletedAt — conserva el historial ("mensaje eliminado") y cumple con Meta
  // (instagram_manage_messages: el contenido deja de almacenarse).
  const existing = await prisma.whatsAppMessage.findUnique({ where: { mid } });

  // Idempotente: si no existe o ya estaba borrado, respondemos 200 sin tocar nada.
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ ok: true, deleted: false });
  }

  await prisma.whatsAppMessage.update({
    where: { mid },
    data: { body: "", deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true, deleted: true });
}
