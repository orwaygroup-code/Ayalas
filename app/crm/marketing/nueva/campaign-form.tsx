"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tagColor } from "@/lib/tag-colors";

type Tag = { id: string; name: string; color: string };
type Mode = "any" | "all";
type Source = "conv" | "user" | "both";

export default function CampaignForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("es_MX");
  const [body, setBody] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [varValues, setVarValues] = useState<Record<string, string>>({});

  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("any");
  const [source, setSource] = useState<Source>("conv");
  const [scheduledAt, setScheduledAt] = useState("");

  const [reach, setReach] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/crm/tags", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  // Variables {{n}} detectadas en el cuerpo.
  const vars = useMemo(() => {
    const found = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]);
    return [...new Set(found)].sort((a, b) => Number(a) - Number(b));
  }, [body]);

  // Alcance en vivo (debounced) cuando cambian los filtros.
  useEffect(() => {
    if (selected.size === 0) {
      setReach(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/crm/marketing/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filters: { tagIds: [...selected], mode, source },
          }),
        });
        const d = await res.json();
        setReach(d.count ?? 0);
      } catch {
        setReach(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [selected, mode, source]);

  function toggleTag(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const previewText = body.replace(
    /\{\{(\d+)\}\}/g,
    (_, n) => varValues[n]?.trim() || `{{${n}}}`,
  );

  async function submit(alsoSend: boolean) {
    setError(null);
    if (!name.trim() || !templateName.trim() || selected.size === 0) {
      setError("Falta nombre, plantilla o al menos un tag.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        templateName: templateName.trim(),
        templateLanguage: templateLanguage.trim() || "es_MX",
        templateParams: varValues,
        filters: { tagIds: [...selected], mode, source },
      };
      if (headerImageUrl.trim()) payload.headerImageUrl = headerImageUrl.trim();
      if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString();

      const res = await fetch("/api/crm/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("No se pudo crear la campaña.");
        setSaving(false);
        return;
      }
      const { id } = await res.json();

      if (alsoSend) {
        const sres = await fetch(`/api/crm/marketing/campaigns/${id}/send`, {
          method: "POST",
        });
        if (!sres.ok) {
          const d = await sres.json().catch(() => ({}));
          setError(d.error ?? "Campaña creada, pero el envío falló.");
          setSaving(false);
          return;
        }
      }
      router.push("/crm/marketing");
      router.refresh();
    } catch {
      setError("Error de red.");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Formulario */}
      <div className="space-y-5">
        <Field label="Nombre de la campaña">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Promo de verano"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Plantilla de Meta (nombre aprobado)">
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className={inputCls}
              placeholder="promo_verano"
            />
          </Field>
          <Field label="Idioma">
            <input
              value={templateLanguage}
              onChange={(e) => setTemplateLanguage(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Cuerpo del mensaje (para preview; usa {{1}}, {{2}}…)">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="¡Hola {{1}}! Tenemos una promo especial para ti 💪"
          />
        </Field>

        {vars.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Variables</p>
            {vars.map((v) => (
              <div key={v} className="flex items-center gap-2">
                <span className="w-10 text-xs text-slate-400">{`{{${v}}}`}</span>
                <input
                  value={varValues[v] ?? ""}
                  onChange={(e) =>
                    setVarValues((vv) => ({ ...vv, [v]: e.target.value }))
                  }
                  className={inputCls}
                  placeholder={`Valor para {{${v}}}`}
                />
              </div>
            ))}
          </div>
        )}

        <Field label="Imagen de encabezado (URL, opcional)">
          <input
            value={headerImageUrl}
            onChange={(e) => setHeaderImageUrl(e.target.value)}
            className={inputCls}
            placeholder="https://…/banner.jpg"
          />
        </Field>

        {/* Segmentación */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Segmentar por tag
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {tags.length === 0 && (
              <span className="text-xs text-slate-400">No hay tags todavía.</span>
            )}
            {tags.map((t) => {
              const on = selected.has(t.id);
              const c = tagColor(t.color);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                    on ? c.pill : "border-slate-200 text-slate-500"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  {t.name}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-1">
              Coincidencia:
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                className="rounded border border-slate-200 px-1 py-0.5"
              >
                <option value="any">cualquiera (OR)</option>
                <option value="all">todos (AND)</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              Origen:
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as Source)}
                className="rounded border border-slate-200 px-1 py-0.5"
              >
                <option value="conv">Conversaciones</option>
                <option value="user">Socios</option>
                <option value="both">Ambos</option>
              </select>
            </label>
          </div>

          <p className="mt-3 text-sm">
            Alcance:{" "}
            <span className="font-semibold text-brand-dark">
              {selected.size === 0
                ? "— elige tags"
                : reach === null
                  ? "calculando…"
                  : `${reach} destinatarios`}
            </span>
          </p>
        </div>

        <Field label="Programar envío (opcional)">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={inputCls}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => submit(false)}
            disabled={saving}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            onClick={() => submit(true)}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Guardando…" : scheduledAt ? "Crear y programar" : "Crear y enviar"}
          </button>
        </div>
      </div>

      {/* Preview WhatsApp (sticky) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm font-medium text-slate-700">Vista previa</p>
        <div className="rounded-2xl bg-[#e5ddd5] p-4">
          <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white p-2 shadow-sm">
            {headerImageUrl.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headerImageUrl}
                alt="header"
                className="mb-2 max-h-40 w-full rounded object-cover"
              />
            )}
            <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
              {previewText || "Tu mensaje aparecerá aquí…"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
