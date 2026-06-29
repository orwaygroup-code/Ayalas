import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-shell";

export const dynamic = "force-dynamic";

// Zona horaria del gimnasio (México no usa DST desde 2022 → offset fijo -6h).
const MX_OFFSET_MIN = -6 * 60;

type LeadStatus = "NUEVO" | "CONTACTADO" | "CONVERTIDO" | "PERDIDO";
const STATUSES: LeadStatus[] = ["NUEVO", "CONTACTADO", "CONVERTIDO", "PERDIDO"];

const STATUS_META: Record<LeadStatus, { label: string; bar: string }> = {
  NUEVO: { label: "Nuevos", bar: "bg-blue-500" },
  CONTACTADO: { label: "Contactados", bar: "bg-amber-500" },
  CONVERTIDO: { label: "Convertidos", bar: "bg-green-500" },
  PERDIDO: { label: "Perdidos", bar: "bg-slate-400" },
};

// Componentes locales de fecha en hora MX (createdAt se guarda en UTC).
function mxParts(d: Date) {
  const t = new Date(d.getTime() + MX_OFFSET_MIN * 60000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}
function mxDayStartUtc(y: number, m: number, d: number) {
  // Medianoche local MX expresada como instante UTC.
  return new Date(Date.UTC(y, m, d) - MX_OFFSET_MIN * 60000);
}

function pct(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

async function getStats(now: Date) {
  const leads = await prisma.lead.findMany({
    select: { status: true, createdAt: true },
  });

  // Embudo (snapshot global) + conversión.
  const byStatus: Record<LeadStatus, number> = {
    NUEVO: 0,
    CONTACTADO: 0,
    CONVERTIDO: 0,
    PERDIDO: 0,
  };
  for (const l of leads) byStatus[l.status as LeadStatus]++;
  const total = leads.length;
  const convertidos = byStatus.CONVERTIDO;
  const conversionPct = total ? Math.round((convertidos / total) * 100) : 0;

  // Mes actual vs mes anterior (en hora MX).
  const p = mxParts(now);
  const monthStart = mxDayStartUtc(p.y, p.m, 1);
  const nextMonth = mxDayStartUtc(p.y, p.m + 1, 1);
  const prevMonth = mxDayStartUtc(p.y, p.m - 1, 1);
  const inRange = (d: Date, a: Date, b: Date) => d >= a && d < b;
  const leadsMes = leads.filter((l) =>
    inRange(l.createdAt, monthStart, nextMonth),
  ).length;
  const leadsMesPrev = leads.filter((l) =>
    inRange(l.createdAt, prevMonth, monthStart),
  ).length;

  // Últimos 30 días (buckets por día MX).
  const chart: { label: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const start = mxDayStartUtc(p.y, p.m, p.d - i);
    const end = mxDayStartUtc(p.y, p.m, p.d - i + 1);
    chart.push({
      label: String(mxParts(start).d),
      count: leads.filter((l) => inRange(l.createdAt, start, end)).length,
    });
  }

  return {
    total,
    convertidos,
    conversionPct,
    leadsMes,
    leadsMesGrowth: pct(leadsMes, leadsMesPrev),
    byStatus,
    chart,
  };
}

function StatCard({
  label,
  value,
  growth,
  suffix,
}: {
  label: string;
  value: number;
  growth?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">
        {value}
        {suffix}
      </p>
      {growth !== undefined && (
        <p
          className={`mt-1 text-xs font-medium ${
            growth >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% vs mes anterior
        </p>
      )}
    </div>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (pct / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#ff5b03"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
        />
      </svg>
      <div>
        <p className="text-3xl font-semibold text-slate-900">{pct}%</p>
        <p className="text-sm text-slate-500">de leads convertidos</p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getStats>> | null = null;
  let dbOk = true;
  try {
    stats = await getStats(new Date());
  } catch {
    dbOk = false;
  }

  const maxStatus = stats
    ? Math.max(1, ...STATUSES.map((s) => stats!.byStatus[s]))
    : 1;
  const maxChart = stats ? Math.max(1, ...stats.chart.map((b) => b.count)) : 1;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Embudo de leads del gimnasio. Se llena conforme el bot capta prospectos."
      />

      {!dbOk && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo conectar a la base de datos. Revisa <code>DATABASE_URL</code> y corre{" "}
          <code>npm run db:push</code>.
        </div>
      )}

      {stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Leads totales" value={stats.total} />
            <StatCard
              label="Nuevos este mes"
              value={stats.leadsMes}
              growth={stats.leadsMesGrowth}
            />
            <StatCard label="Convertidos" value={stats.convertidos} />
            <StatCard label="Conversión" value={stats.conversionPct} suffix="%" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Embudo por estado */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-medium text-slate-700">
                Embudo por estado
              </h2>
              <div className="space-y-3">
                {STATUSES.map((s) => {
                  const n = stats!.byStatus[s];
                  return (
                    <div key={s}>
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>{STATUS_META[s].label}</span>
                        <span>{n}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${STATUS_META[s].bar}`}
                          style={{ width: `${(n / maxStatus) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Donut de conversión */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-medium text-slate-700">
                Conversión
              </h2>
              <Donut pct={stats.conversionPct} />
            </div>
          </div>

          {/* Leads por día (últimos 30 días) — scroll horizontal interno en móvil */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-medium text-slate-700">
              Leads por día (últimos 30 días)
            </h2>
            <div className="overflow-x-auto">
              <div
                className="grid h-40 items-end gap-1"
                style={{
                  gridAutoFlow: "column",
                  gridAutoColumns: "minmax(20px, 1fr)",
                }}
              >
                {stats.chart.map((b, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-end gap-1"
                    title={`${b.count} leads`}
                  >
                    <div
                      className="w-full rounded-t bg-brand"
                      style={{
                        height: `${(b.count / maxChart) * 100}%`,
                        minHeight: b.count > 0 ? "4px" : "0",
                      }}
                    />
                    <span className="text-[10px] text-slate-400">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
