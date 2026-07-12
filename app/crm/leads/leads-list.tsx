"use client";

import { useEffect, useState } from "react";

type LeadStatus = "NUEVO" | "CONTACTADO" | "CONVERTIDO" | "PERDIDO";

type Lead = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  source: string | null;
  status: LeadStatus;
  interestedPlan: string | null;
  conversations: number;
  createdAt: string;
};

const STATUSES: LeadStatus[] = ["NUEVO", "CONTACTADO", "CONVERTIDO", "PERDIDO"];

const STATUS_STYLE: Record<LeadStatus, string> = {
  NUEVO: "bg-blue-100 text-blue-700",
  CONTACTADO: "bg-amber-100 text-amber-700",
  CONVERTIDO: "bg-green-100 text-green-700",
  PERDIDO: "bg-slate-100 text-slate-500",
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/crm/leads", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setLeads(d.leads);
      setError(null);
    } catch {
      setError("No se pudieron cargar los leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id: string, status: LeadStatus) {
    // Optimista: actualiza la UI y revierte si falla.
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch(`/api/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) load();
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">
          Aún no hay leads. El bot los captura automáticamente cuando detecta un
          prospecto interesado.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Contacto</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Origen</th>
            <th className="px-4 py-3 font-semibold">Interés</th>
            <th className="px-4 py-3 font-semibold">Creado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr
              key={l.id}
              className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{l.name ?? "—"}</p>
                <p className="nums text-xs text-slate-400">{l.phone}</p>
              </td>
              <td className="px-4 py-3">
                <select
                  value={l.status}
                  onChange={(e) =>
                    changeStatus(l.id, e.target.value as LeadStatus)
                  }
                  className={`cursor-pointer appearance-none rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[l.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-slate-500">{l.source ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">
                {l.interestedPlan ?? "—"}
              </td>
              <td className="nums px-4 py-3 text-slate-400">
                {fecha(l.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
