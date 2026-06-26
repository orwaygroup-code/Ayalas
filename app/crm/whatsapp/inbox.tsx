"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// ── Tipos (espejo de lo que devuelven los endpoints /api/crm/whatsapp/*) ──
type Plataforma = "whatsapp" | "messenger" | "instagram" | string;

type ConvTag = { id: string; name: string; color: string; source: string };

type ConversationRow = {
  id: string;
  phone: string;
  contactName: string | null;
  memberId: string | null;
  leadId: string | null;
  lastMessage: {
    body: string;
    direction: "INBOUND" | "OUTBOUND";
    sentAt: string;
    deletedAt: string | null;
    plataforma: Plataforma | null;
  } | null;
  messageCount: number;
  tags: ConvTag[];
  updatedAt: string;
};

type ThreadMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  messageType: string;
  plataforma: Plataforma | null;
  deletedAt: string | null;
  sentAt: string;
};

type Thread = {
  id: string;
  phone: string;
  contactName: string | null;
  tags: ConvTag[];
  messages: ThreadMessage[];
};

const POLL_MS = 5000;

// Badge de plataforma por canal (gotcha de UI del context pack).
const PLATAFORMA_META: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "#25d366" },
  instagram: { label: "Instagram", color: "#e1306c" },
  messenger: { label: "Messenger", color: "#0084ff" },
};

function plataformaMeta(p: Plataforma | null | undefined) {
  return PLATAFORMA_META[p ?? "whatsapp"] ?? PLATAFORMA_META.whatsapp;
}

function timeShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Inbox() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll inteligente: solo auto-baja si el usuario YA estaba cerca del fondo.
  const threadRef = useRef<HTMLDivElement>(null);
  const wasNearBottom = useRef(true);
  const convChanged = useRef(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/whatsapp/conversations", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo cargar la lista");
      const data = await res.json();
      setConversations(data.conversations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchThread = useCallback(async (phone: string) => {
    try {
      const res = await fetch(
        `/api/crm/whatsapp/conversations/${encodeURIComponent(phone)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as Thread;
      setThread(data);
    } catch {
      /* el polling reintenta */
    }
  }, []);

  // Polling de la lista.
  useEffect(() => {
    fetchList();
    const id = setInterval(fetchList, POLL_MS);
    return () => clearInterval(id);
  }, [fetchList]);

  // Polling del hilo seleccionado.
  useEffect(() => {
    if (!selected) {
      setThread(null);
      return;
    }
    convChanged.current = true;
    fetchThread(selected);
    const id = setInterval(() => fetchThread(selected), POLL_MS);
    return () => clearInterval(id);
  }, [selected, fetchThread]);

  // Antes de pintar mensajes nuevos, recuerda si el usuario estaba abajo.
  const onThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    wasNearBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Tras renderizar el hilo: baja al fondo solo si tocaba (cambio de conv o
  // el usuario ya estaba cerca del fondo). Si lee arriba, no lo movemos.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el || !thread) return;
    if (convChanged.current || wasNearBottom.current) {
      el.scrollTop = el.scrollHeight;
      convChanged.current = false;
    }
  }, [thread]);

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white md:h-[calc(100vh-8rem)]">
      {/* ── Lista de conversaciones ── */}
      <aside
        className={`flex w-full shrink-0 flex-col border-r border-slate-200 md:w-80 ${
          selected ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-700">
            Conversaciones{" "}
            <span className="text-slate-400">({conversations.length})</span>
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && (
            <p className="px-4 py-3 text-sm text-red-600">{error}</p>
          )}
          {!error && loadingList && (
            <p className="px-4 py-3 text-sm text-slate-400">Cargando…</p>
          )}
          {!error && !loadingList && conversations.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              Sin conversaciones todavía. Llegan cuando el bot recibe mensajes.
            </p>
          )}
          <ul>
            {conversations.map((c) => {
              const pm = plataformaMeta(c.lastMessage?.plataforma);
              const active = selected === c.phone;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.phone)}
                    className={`flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      active ? "bg-slate-100" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 truncate font-medium text-slate-800">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: pm.color }}
                          title={pm.label}
                        />
                        {c.contactName ?? c.phone}
                      </span>
                      {c.lastMessage && (
                        <span className="shrink-0 text-xs text-slate-400">
                          {timeShort(c.lastMessage.sentAt)}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-sm text-slate-500">
                      {c.lastMessage
                        ? c.lastMessage.deletedAt
                          ? "🚫 Mensaje eliminado"
                          : `${
                              c.lastMessage.direction === "OUTBOUND" ? "Tú: " : ""
                            }${c.lastMessage.body}`
                        : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* ── Hilo ── */}
      <section
        className={`min-w-0 flex-1 flex-col ${
          selected ? "flex" : "hidden md:flex"
        }`}
      >
        {!selected && (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
            Selecciona una conversación para ver el hilo.
          </div>
        )}

        {selected && (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 md:hidden"
                aria-label="Volver"
              >
                ←
              </button>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {thread?.contactName ?? selected}
                </p>
                {thread?.contactName && (
                  <p className="truncate text-xs text-slate-400">{selected}</p>
                )}
              </div>
            </header>

            <div
              ref={threadRef}
              onScroll={onThreadScroll}
              className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-4"
            >
              {!thread && (
                <p className="text-center text-sm text-slate-400">Cargando…</p>
              )}
              {thread?.messages.length === 0 && (
                <p className="text-center text-sm text-slate-400">
                  Sin mensajes.
                </p>
              )}
              {thread?.messages.map((m) => {
                const outbound = m.direction === "OUTBOUND";
                return (
                  <div
                    key={m.id}
                    className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        outbound
                          ? "bg-brand text-white"
                          : "bg-white text-slate-800 shadow-sm"
                      }`}
                    >
                      {m.deletedAt ? (
                        <span
                          className={`italic ${
                            outbound ? "text-white/70" : "text-slate-400"
                          }`}
                        >
                          🚫 Este mensaje fue eliminado
                        </span>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">
                          {m.body}
                        </span>
                      )}
                      <span
                        className={`mt-1 block text-right text-[10px] ${
                          outbound ? "text-white/60" : "text-slate-400"
                        }`}
                      >
                        {timeShort(m.sentAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
