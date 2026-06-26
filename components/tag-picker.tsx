"use client";

import { useEffect, useRef, useState } from "react";
import { tagColor } from "@/lib/tag-colors";

type TagOption = { id: string; name: string; color: string };

// Combobox para buscar/crear un tag y asignarlo. Se apoya en:
//   GET  /api/crm/tags            (lista)
//   POST /api/crm/tags            (crear; reutiliza si el nombre ya existe)
export function TagPicker({
  assignedTagIds,
  onAssign,
}: {
  assignedTagIds: string[];
  onAssign: (tagId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/crm/tags", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = query.trim().toLowerCase();
  const available = tags.filter(
    (t) => !assignedTagIds.includes(t.id) && t.name.toLowerCase().includes(q),
  );
  const exactExists = tags.some((t) => t.name.toLowerCase() === q);

  async function assign(tagId: string) {
    setBusy(true);
    try {
      await onAssign(tagId);
      setQuery("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function createAndAssign() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query.trim() }),
      });
      const d = await res.json();
      if (d.tag?.id) await onAssign(d.tag.id);
      setQuery("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 transition hover:bg-slate-50"
      >
        + Tag
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o crear…"
            className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand"
          />
          <ul className="max-h-48 overflow-y-auto">
            {available.map((t) => {
              const c = tagColor(t.color);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => assign(t.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                    {t.name}
                  </button>
                </li>
              );
            })}
            {query.trim() && !exactExists && (
              <li>
                <button
                  type="button"
                  disabled={busy}
                  onClick={createAndAssign}
                  className="w-full rounded px-2 py-1 text-left text-sm text-brand-dark hover:bg-slate-50 disabled:opacity-50"
                >
                  + Crear “{query.trim()}”
                </button>
              </li>
            )}
            {available.length === 0 && (exactExists || !query.trim()) && (
              <li className="px-2 py-1 text-xs text-slate-400">
                {query.trim() ? "Ya asignado" : "Escribe para buscar o crear"}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
