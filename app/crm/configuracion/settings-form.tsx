"use client";

import { useEffect, useState } from "react";

// Etiquetas amigables para las claves conocidas del bot. Las claves que no
// estén aquí se muestran con su nombre crudo (el sistema sigue siendo k/v libre).
const LABELS: Record<string, { label: string; multiline?: boolean }> = {
  gym_name: { label: "Nombre del gimnasio" },
  address: { label: "Dirección" },
  hours: { label: "Horario" },
  phone: { label: "Teléfono de contacto" },
  welcome_message: { label: "Mensaje de bienvenida del bot", multiline: true },
};

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/crm/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setValues(d.settings ?? {}))
      .catch(() => setError("No se pudo cargar la configuración."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/crm/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Cargando…</p>;
  }

  const keys = Object.keys(values).sort((a, b) => {
    // Claves conocidas primero, en el orden de LABELS; luego el resto alfabético.
    const order = Object.keys(LABELS);
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });

  return (
    <div className="max-w-2xl space-y-4">
      {keys.map((key) => {
        const meta = LABELS[key];
        return (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {meta?.label ?? key}
            </label>
            {meta?.multiline ? (
              <textarea
                value={values[key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            ) : (
              <input
                value={values[key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {saved && <span className="text-sm text-green-600">Guardado ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
