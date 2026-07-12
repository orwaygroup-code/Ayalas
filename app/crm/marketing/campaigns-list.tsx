"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus } from "@/components/icons";

type Status =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type Campaign = {
  id: string;
  name: string;
  templateName: string;
  status: Status;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<Status, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-400",
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

export default function CampaignsList() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/crm/marketing/campaigns", {
      cache: "no-store",
    });
    const d = await res.json();
    setItems(d.campaigns ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function send(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/crm/marketing/campaigns/${id}/send`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "No se pudo enviar.");
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta campaña?")) return;
    setBusy(id);
    try {
      await fetch(`/api/crm/marketing/campaigns/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link
          href="/crm/marketing/nueva"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98]"
        >
          <IconPlus className="h-4 w-4" />
          Nueva campaña
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Aún no hay campañas. Crea una para enviar mensajes segmentados por
            tag.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const pct =
              c.totalTargets > 0
                ? Math.round((c.sentCount / c.totalTargets) * 100)
                : 0;
            const canManage = c.status === "DRAFT" || c.status === "SCHEDULED";
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="nums text-xs text-slate-400">
                      Plantilla: {c.templateName} · {fecha(c.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status]}`}
                  >
                    {c.status}
                  </span>
                </div>

                {c.totalTargets > 0 && (
                  <div className="mt-3">
                    <div className="nums mb-1 flex justify-between text-xs text-slate-500">
                      <span>
                        {c.sentCount}/{c.totalTargets} enviados
                        {c.failedCount > 0 && ` · ${c.failedCount} fallidos`}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {canManage && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => send(c.id)}
                      disabled={busy === c.id}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
                    >
                      {busy === c.id ? "…" : "Enviar"}
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      disabled={busy === c.id}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
