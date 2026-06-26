import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";
import { normalizeIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

// El bot (n8n) llama aquí cuando el LLM detecta un prospecto y extrae sus datos.
const schema = z.object({
  phone: z.string().min(1),
  plataforma: z.enum(["whatsapp", "messenger", "instagram"]).default("whatsapp"),
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  source: z.string().trim().optional(),
  interestedPlan: z.string().trim().optional(), // nombre del plan, ej. "Mensual"
  notes: z.string().trim().optional(),
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
  const { phone, plataforma, name, email, source, interestedPlan, notes } =
    parsed.data;

  const identity = normalizeIdentity(phone, plataforma);

  // Si ya es socio, NO es lead: solo enlazamos la conversación al socio.
  const member = await prisma.member.findUnique({
    where: { phone: identity },
    select: { id: true },
  });
  if (member) {
    await prisma.whatsAppConversation.updateMany({
      where: { phone: identity },
      data: { memberId: member.id },
    });
    return NextResponse.json({ ok: true, isMember: true, memberId: member.id });
  }

  // Resolver plan de interés por nombre (opcional; si no existe, se ignora).
  let interestedPlanId: string | undefined;
  if (interestedPlan) {
    const plan = await prisma.membershipPlan.findFirst({
      where: { name: interestedPlan, isActive: true },
      select: { id: true },
    });
    interestedPlanId = plan?.id;
  }

  const lead = await prisma.lead.upsert({
    where: { phone: identity },
    // En update solo tocamos lo que vino (no pisamos con null lo ya capturado).
    update: {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(source ? { source } : {}),
      ...(interestedPlanId ? { interestedPlanId } : {}),
      ...(notes ? { notes } : {}),
    },
    create: {
      phone: identity,
      name,
      email,
      source: source ?? plataforma,
      status: "NUEVO",
      interestedPlanId,
      notes,
    },
  });

  // Enlazar la conversación del canal con el lead (si aún no tiene).
  await prisma.whatsAppConversation.updateMany({
    where: { phone: identity, leadId: null },
    data: { leadId: lead.id },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
