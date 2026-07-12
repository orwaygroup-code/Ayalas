"use client";

import { useEffect, useState } from "react";
import { IconKey } from "@/components/icons";

type Status = "ACTIVO" | "CONGELADO" | "CANCELADO" | "INVITADO";

type Member = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: Status;
  hasLogin: boolean;
  plan: string | null;
  membershipEnd: string | null;
  bookings: number;
  joinedAt: string;
};

const STATUSES: Status[] = ["ACTIVO", "CONGELADO", "CANCELADO", "INVITADO"];

const STATUS_STYLE: Record<Status, string> = {
  ACTIVO: "bg-green-100 text-green-700",
  CONGELADO: "bg-amber-100 text-amber-700",
  CANCELADO: "bg-slate-100 text-slate-500",
  INVITADO: "bg-blue-100 text-blue-700",
};

function fecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/crm/members", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMembers(d.members);
      setError(null);
    } catch {
      setError("No se pudieron cargar los socios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id: string, status: Status) {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, status } : m)));
    const res = await fetch(`/api/crm/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) load();
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">Aún no hay socios registrados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Socio</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Plan</th>
            <th className="px-4 py-3 font-semibold">Vence</th>
            <th className="px-4 py-3 font-semibold">Reservas</th>
            <th className="px-4 py-3 font-semibold" title="Acceso al portal/app">
              Acceso
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.id}
              className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{m.name}</p>
                <p className="text-xs text-slate-400">
                  <span className="nums">{m.phone}</span>
                  {m.email ? ` · ${m.email}` : ""}
                </p>
              </td>
              <td className="px-4 py-3">
                <select
                  value={m.status}
                  onChange={(e) =>
                    changeStatus(m.id, e.target.value as Status)
                  }
                  className={`cursor-pointer appearance-none rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[m.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-slate-500">{m.plan ?? "—"}</td>
              <td className="nums px-4 py-3 text-slate-400">
                {fecha(m.membershipEnd)}
              </td>
              <td className="nums px-4 py-3 text-slate-500">{m.bookings}</td>
              <td className="px-4 py-3">
                {m.hasLogin ? (
                  <IconKey
                    className="h-[18px] w-[18px] text-brand"
                    aria-label="Tiene acceso habilitado"
                  />
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
