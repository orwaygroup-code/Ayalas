import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — detalle de una campaña.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const c = await prisma.marketingCampaign.findUnique({
    where: { id: params.id },
  });
  if (!c) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: c.id,
    name: c.name,
    templateName: c.templateName,
    templateLanguage: c.templateLanguage,
    templateParams: c.templateParams,
    headerImageUrl: c.headerImageUrl,
    filters: c.filters,
    status: c.status,
    totalTargets: c.totalTargets,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    scheduledAt: c.scheduledAt,
    createdAt: c.createdAt,
  });
}

// DELETE — solo se permite borrar borradores o programadas (no algo en envío).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const c = await prisma.marketingCampaign.findUnique({
    where: { id: params.id },
    select: { status: true },
  });
  if (!c) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  if (c.status === "SENDING") {
    return NextResponse.json(
      { error: "No se puede borrar una campaña en envío" },
      { status: 409 },
    );
  }

  await prisma.marketingCampaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
