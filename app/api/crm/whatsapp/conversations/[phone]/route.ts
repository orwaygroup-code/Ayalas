import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { phone: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // `phone` es la identidad (teléfono o PSID/IGSID) tal cual se guardó.
  const identity = decodeURIComponent(params.phone);

  const conversation = await prisma.whatsAppConversation.findUnique({
    where: { phone: identity },
    include: {
      member: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversación no encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id: conversation.id,
    phone: conversation.phone,
    contactName: conversation.member?.name ?? conversation.lead?.name ?? null,
    memberId: conversation.memberId,
    leadId: conversation.leadId,
    tags: conversation.tags.map((ct) => ({
      id: ct.tag.id,
      name: ct.tag.name,
      color: ct.tag.color,
      source: ct.source,
    })),
    messages: conversation.messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      body: m.body,
      messageType: m.messageType,
      plataforma: m.plataforma,
      deletedAt: m.deletedAt,
      sentAt: m.sentAt,
    })),
  });
}
