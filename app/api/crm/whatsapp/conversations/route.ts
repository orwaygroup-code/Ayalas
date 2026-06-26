import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const convs = await prisma.whatsAppConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      member: { select: { name: true } },
      lead: { select: { name: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
      tags: { include: { tag: true } },
      _count: { select: { messages: true } },
    },
  });

  const data = convs.map((c) => {
    const last = c.messages[0];
    return {
      id: c.id,
      phone: c.phone,
      memberId: c.memberId,
      leadId: c.leadId,
      // Nombre del contacto si está vinculado a socio o lead; si no, el teléfono.
      contactName: c.member?.name ?? c.lead?.name ?? null,
      lastMessage: last
        ? {
            body: last.body,
            direction: last.direction,
            sentAt: last.sentAt,
            deletedAt: last.deletedAt,
            plataforma: last.plataforma,
          }
        : null,
      messageCount: c._count.messages,
      tags: c.tags.map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        color: ct.tag.color,
        source: ct.source,
      })),
      updatedAt: c.updatedAt,
    };
  });

  return NextResponse.json({ conversations: data });
}
