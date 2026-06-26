import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      interestedPlan: { select: { name: true } },
      _count: { select: { conversations: true } },
    },
  });

  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      status: l.status,
      interestedPlan: l.interestedPlan?.name ?? null,
      notes: l.notes,
      conversations: l._count.conversations,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    })),
  });
}
