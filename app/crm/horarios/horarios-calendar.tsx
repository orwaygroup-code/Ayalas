"use client";

import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconTrash } from "@/components/icons";

type Clase = {
  id: string;
  name: string;
  room: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  instructorId: string | null;
  instructorName: string | null;
};

type Instructor = { id: string; name: string; isActive: boolean };

const DIAS = [
  { n: 1, label: "Lunes" },
  { n: 2, label: "Martes" },
  { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" },
  { n: 5, label: "Viernes" },
  { n: 6, label: "Sábado" },
];

// AM = antes de las 12:00; PM = 12:00 en adelante.
function esAM(t: string | null) {
  return (t ?? "00:00") < "12:00";
}

export default function HorariosCalendar() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [profes, setProfes] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [rc, ri] = await Promise.all([
        fetch("/api/crm/classes", { cache: "no-store" }),
        fetch("/api/crm/instructors", { cache: "no-store" }),
      ]);
      if (!rc.ok || !ri.ok) throw new Error();
      const dc = await rc.json();
      const di = await ri.json();
      setClases(dc.classes);
      setProfes(di.instructors.filter((p: Instructor) => p.isActive));
      setError(null);
    } catch {
      setError("No se pudo cargar el horario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Áreas (rooms) presentes, ordenadas con Indoor primero.
  const areas = useMemo(() => {
    const set = Array.from(
      new Set(clases.map((c) => c.room ?? "Sin área")),
    );
    return set.sort((a, b) =>
      a.toLowerCase().includes("indoor") ? -1 : b.toLowerCase().includes("indoor") ? 1 : a.localeCompare(b),
    );
  }, [clases]);

  // Nombres de clase existentes, para el drop list del alta.
  const classNames = useMemo(
    () => Array.from(new Set(clases.map((c) => c.name))).sort(),
    [clases],
  );

  async function assign(claseId: string, instructorId: string) {
    setClases((cs) =>
      cs.map((c) =>
        c.id === claseId
          ? {
              ...c,
              instructorId: instructorId || null,
              instructorName:
                profes.find((p) => p.id === instructorId)?.name ?? null,
            }
          : c,
      ),
    );
    const res = await fetch(`/api/crm/classes/${claseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructorId: instructorId || null }),
    });
    if (!res.ok) load();
  }

  async function removeClase(claseId: string) {
    if (!confirm("¿Quitar esta clase del horario?")) return;
    await fetch(`/api/crm/classes/${claseId}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      {profes.length === 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aún no hay profesores. Da de alta profesores en la sección{" "}
          <b>Profesores</b> para poder asignarlos a las clases.
        </div>
      )}

      {areas.map((area) => (
        <section
          key={area}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
        >
          <header className="border-b border-slate-200 bg-slate-50/60 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">{area}</h2>
          </header>
          <div className="divide-y divide-slate-100">
            {DIAS.map((d) => {
              const delDia = clases.filter(
                (c) => (c.room ?? "Sin área") === area && c.dayOfWeek === d.n,
              );
              const am = delDia
                .filter((c) => esAM(c.startTime))
                .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
              const pm = delDia
                .filter((c) => !esAM(c.startTime))
                .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

              return (
                <div
                  key={d.n}
                  className="grid grid-cols-[80px_1fr_1fr] gap-3 px-4 py-3 sm:grid-cols-[110px_1fr_1fr]"
                >
                  <div className="pt-1 text-sm font-semibold text-slate-700">
                    {d.label}
                  </div>
                  {[
                    { label: "AM", list: am },
                    { label: "PM", list: pm },
                  ].map((col) => (
                    <div key={col.label} className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                        {col.label}
                      </p>
                      {col.list.length === 0 ? (
                        <p className="text-xs text-slate-300">—</p>
                      ) : (
                        col.list.map((c) => (
                          <div
                            key={c.id}
                            className="group rounded-xl border border-slate-200 bg-slate-50/50 p-2.5"
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                <span className="nums text-brand-dark">
                                  {c.startTime}
                                </span>{" "}
                                {c.name}
                              </span>
                              <button
                                onClick={() => removeClase(c.id)}
                                aria-label="Quitar clase"
                                className="text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                              >
                                <IconTrash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <select
                              value={c.instructorId ?? ""}
                              onChange={(e) => assign(c.id, e.target.value)}
                              className={`w-full cursor-pointer rounded-lg border px-2 py-1 text-xs outline-none transition-colors focus:border-brand ${
                                c.instructorId
                                  ? "border-brand/30 bg-brand/5 text-brand-dark"
                                  : "border-slate-200 bg-white text-slate-400"
                              }`}
                            >
                              <option value="">Sin profesor</option>
                              {profes.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <AddClase areas={areas} classNames={classNames} onAdded={load} />
    </div>
  );
}

// Formulario compacto para agregar una clase al horario.
function AddClase({
  areas,
  classNames,
  onAdded,
}: {
  areas: string[];
  classNames: string[];
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState(areas[0] ?? "Salón Indoor");
  const [day, setDay] = useState(1);
  const [time, setTime] = useState("18:00");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim() || !room.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crm/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          room: room.trim(),
          dayOfWeek: day,
          startTime: time,
        }),
      });
      if (res.ok) {
        setName("");
        onAdded();
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors hover:border-slate-300 focus:border-brand";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="mb-3 text-sm font-semibold text-slate-700">
        Agregar clase al horario
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputCls} min-w-[150px] flex-1 cursor-pointer`}
        >
          <option value="">Clase…</option>
          {classNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          list="areas"
          placeholder="Área"
          className={`${inputCls} min-w-[160px] flex-1`}
        />
        <datalist id="areas">
          {areas.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className={`${inputCls} cursor-pointer`}
        >
          {DIAS.map((d) => (
            <option key={d.n} value={d.n}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`${inputCls} nums`}
        />
        <button
          onClick={add}
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50"
        >
          <IconPlus className="h-4 w-4" />
          Agregar
        </button>
      </div>
    </div>
  );
}
