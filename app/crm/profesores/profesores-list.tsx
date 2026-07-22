"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconTrash } from "@/components/icons";

type ClaseChip = {
  id: string;
  name: string;
  room: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
};

type Instructor = {
  id: string;
  name: string;
  specialty: string | null;
  isActive: boolean;
  classCount: number;
  classes: ClaseChip[];
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function cuando(c: ClaseChip) {
  const d = c.dayOfWeek != null ? DIAS[c.dayOfWeek] : "";
  return `${c.name}${d ? ` · ${d}` : ""}${c.startTime ? ` ${c.startTime}` : ""}`;
}

export default function ProfesoresList() {
  const [items, setItems] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSpec, setEditSpec] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/crm/instructors", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setItems(d.instructors);
      setError(null);
    } catch {
      setError("No se pudieron cargar los profesores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crm/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          specialty: specialty.trim() || undefined,
        }),
      });
      if (res.ok) {
        setName("");
        setSpecialty("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    await fetch(`/api/crm/instructors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        specialty: editSpec.trim() || null,
      }),
    });
    setEditing(null);
    await load();
  }

  async function toggleActive(i: Instructor) {
    setItems((xs) =>
      xs.map((x) => (x.id === i.id ? { ...x, isActive: !x.isActive } : x)),
    );
    const res = await fetch(`/api/crm/instructors/${i.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !i.isActive }),
    });
    if (!res.ok) load();
  }

  async function remove(i: Instructor) {
    if (!confirm(`¿Eliminar a ${i.name}? Sus clases quedarán sin profesor.`))
      return;
    await fetch(`/api/crm/instructors/${i.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-5">
      {/* Alta */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Nombre del profesor
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Ricardo Ayala"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors hover:border-slate-300 focus:border-brand"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Especialidad <span className="text-slate-400">(opcional)</span>
          </label>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ej. Indoor / RPM"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors hover:border-slate-300 focus:border-brand"
          />
        </div>
        <button
          onClick={add}
          disabled={saving || !name.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
        >
          <IconPlus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            Aún no hay profesores. Agrega el primero arriba.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/60 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Profesor</th>
                <th className="px-4 py-3 font-semibold">Clases activas y horas</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-slate-100 align-top transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3">
                    {editing === i.id ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand"
                        />
                        <input
                          value={editSpec}
                          onChange={(e) => setEditSpec(e.target.value)}
                          placeholder="Especialidad"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-slate-800">{i.name}</p>
                        {i.specialty && (
                          <p className="text-xs text-slate-400">{i.specialty}</p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {i.classes.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        Sin clases asignadas
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {i.classes.map((c) => (
                          <span
                            key={c.id}
                            className="nums rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-dark"
                          >
                            {cuando(c)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(i)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                        i.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {i.isActive ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {editing === i.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(i.id)}
                            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-dark active:scale-[0.98]"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditing(i.id);
                              setEditName(i.name);
                              setEditSpec(i.specialty ?? "");
                            }}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => remove(i)}
                            aria-label="Eliminar"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
