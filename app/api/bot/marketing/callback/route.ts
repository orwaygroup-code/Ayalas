import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

// El worker (n8n) reporta el resultado de cada destinatario tras intentar el
// envío vía Meta. Identifica el target por campaignId + phone.
const schema = z.object({
  campaignId: z.string().min(1),
  phone: z.string().min(1),
  status: z.enum(["SENT", "FAILED", "SKIPPED"]),
  mid: z.string().optional(),
  error: z.string().optional(),
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
  const { campaignId, phone, status, mid, error } = parsed.data;

  const updated = await prisma.marketingCampaignTarget.updateMany({
    where: { campaignId, phone },
    data: {
      status,
      mid: mid ?? null,
      errorMessage: error ?? null,
      sentAt: status === "SENT" ? new Date() : null,
    },
  });
  if (updated.count === 0) {
    return NextResponse.json(
      { error: "Destinatario no encontrado en la campaña" },
      { status: 404 },
    );
  }

  // Recalcula contadores desde los targets (robusto ante reentregas).
  const [sent, failed, pending, total] = await Promise.all([
    prisma.marketingCampaignTarget.count({ where: { campaignId, status: "SENT" } }),
    prisma.marketingCampaignTarget.count({ where: { campaignId, status: "FAILED" } }),
    prisma.marketingCampaignTarget.count({ where: { campaignId, status: "PENDING" } }),
    prisma.marketingCampaignTarget.count({ where: { campaignId } }),
  ]);

  const done = pending === 0;
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: sent,
      failedCount: failed,
      ...(done
        ? { status: "COMPLETED", completedAt: new Date() }
        : { status: "SENDING" }),
    },
  });

  return NextResponse.json({ ok: true, sent, failed, pending, total });
}
