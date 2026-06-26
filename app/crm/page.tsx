import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-shell";

export const dynamic = "force-dynamic";

async function getCounts() {
  try {
    const [members, leads, conversations, plans] = await Promise.all([
      prisma.member.count(),
      prisma.lead.count(),
      prisma.whatsAppConversation.count(),
      prisma.membershipPlan.count({ where: { isActive: true } }),
    ]);
    return { members, leads, conversations, plans, ok: true as const };
  } catch {
    return { members: 0, leads: 0, conversations: 0, plans: 0, ok: false as const };
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const c = await getCounts();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen del gimnasio. Las métricas reales (churn, conversión, ocupación, ingresos) llegan en la Fase 5."
      />
      {!c.ok && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo conectar a la base de datos. Revisa <code>DATABASE_URL</code> y corre{" "}
          <code>npm run db:push</code>.
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Socios" value={c.members} />
        <Stat label="Leads" value={c.leads} />
        <Stat label="Conversaciones" value={c.conversations} />
        <Stat label="Planes activos" value={c.plans} />
      </div>
    </>
  );
}
