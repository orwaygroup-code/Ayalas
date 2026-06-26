import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ tagId: z.string().min(1) });

async function findConversation(phone: string) {
  const identity = decodeURIComponent(phone);
  return prisma.whatsAppConversation.findUnique({ where: { phone: identity } });
}

// POST — asignar un tag a la conversación (idempotente por @@unique).
export async function POST(
  req: Request,
  { params }: { params: { phone: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const conversation = await findConversation(params.phone);
  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  await prisma.conversationTag.upsert({
    where: {
      conversationId_tagId: {
        conversationId: conversation.id,
        tagId: parsed.data.tagId,
      },
    },
    update: {},
    create: {
      conversationId: conversation.id,
      tagId: parsed.data.tagId,
      source: "MANUAL",
      appliedById: staff.staffId,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — quitar un tag de la conversación.
export async function DELETE(
  req: Request,
  { params }: { params: { phone: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const conversation = await findConversation(params.phone);
  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  await prisma.conversationTag.deleteMany({
    where: { conversationId: conversation.id, tagId: parsed.data.tagId },
  });

  return NextResponse.json({ ok: true });
}
