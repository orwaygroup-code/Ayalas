import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";
import { filtersSchema } from "@/lib/marketing";

export const dynamic = "force-dynamic";

// GET — lista de campañas con progreso (enviadas/total).
export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const campaigns = await prisma.marketingCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      templateName: c.templateName,
      status: c.status,
      totalTargets: c.totalTargets,
      sentCount: c.sentCount,
      failedCount: c.failedCount,
      scheduledAt: c.scheduledAt,
      createdAt: c.createdAt,
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  templateName: z.string().trim().min(1),
  templateLanguage: z.string().trim().default("es_MX"),
  templateParams: z.record(z.string(), z.string()).optional(),
  headerImageUrl: z.string().url().optional(),
  filters: filtersSchema,
  scheduledAt: z.string().datetime().optional(),
});

// POST — crea una campaña en DRAFT.
export async function POST(req: Request) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const campaign = await prisma.marketingCampaign.create({
    data: {
      name: d.name,
      templateName: d.templateName,
      templateLanguage: d.templateLanguage,
      templateParams: d.templateParams ?? {},
      headerImageUrl: d.headerImageUrl,
      filters: d.filters,
      status: "DRAFT",
      scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
    },
  });

  return NextResponse.json({ id: campaign.id }, { status: 201 });
}
