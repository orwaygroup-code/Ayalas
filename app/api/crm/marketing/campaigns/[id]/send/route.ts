import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";
import { filtersSchema, resolveRecipients } from "@/lib/marketing";

export const dynamic = "force-dynamic";

// POST — resuelve la audiencia y deja los destinatarios en PENDING.
// El ENVÍO real a Meta lo hace el worker (n8n), que consume los PENDING y
// reporta a /api/bot/marketing/callback. Aquí no se manda nada a Meta.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: params.id },
  });
  if (!campaign) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  if (campaign.status === "SENDING" || campaign.status === "COMPLETED") {
    return NextResponse.json(
      { error: `La campaña ya está en estado ${campaign.status}` },
      { status: 409 },
    );
  }

  const parsedFilters = filtersSchema.safeParse(campaign.filters);
  if (!parsedFilters.success) {
    return NextResponse.json(
      { error: "La campaña no tiene filtros válidos" },
      { status: 400 },
    );
  }

  const recipients = await resolveRecipients(parsedFilters.data);
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "Sin destinatarios para esos filtros" },
      { status: 400 },
    );
  }

  const scheduled = campaign.scheduledAt && campaign.scheduledAt > new Date();

  await prisma.$transaction([
    // Reinicia targets previos (re-envío de un borrador) y crea los nuevos.
    prisma.marketingCampaignTarget.deleteMany({
      where: { campaignId: campaign.id },
    }),
    prisma.marketingCampaignTarget.createMany({
      data: recipients.map((r) => ({
        campaignId: campaign.id,
        phone: r.phone,
        conversationId: r.conversationId ?? null,
        memberId: r.memberId ?? null,
        status: "PENDING",
      })),
    }),
    prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: {
        status: scheduled ? "SCHEDULED" : "SENDING",
        totalTargets: recipients.length,
        sentCount: 0,
        failedCount: 0,
        startedAt: scheduled ? null : new Date(),
        completedAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    status: scheduled ? "SCHEDULED" : "SENDING",
    totalTargets: recipients.length,
  });
}
