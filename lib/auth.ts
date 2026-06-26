import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, type SessionData } from "@/lib/session";

/**
 * Lee la sesión del CRM. Útil en Server Components, Route Handlers y Server Actions.
 * En Server Components la cookie es de solo lectura (no llamar a .save()).
 */
export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

/** Devuelve el staff logueado o null. */
export async function getCurrentStaff(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.staffId) return null;
  return {
    staffId: session.staffId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
}

/**
 * Guard para páginas (Server Components): redirige a /login si no hay sesión.
 * Equivalente a `requireAdmin` del context pack, adaptado a Ayalas.
 */
export async function requireStaff(): Promise<SessionData> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  return staff;
}

/**
 * Guard para Route Handlers de API del CRM: devuelve el staff o null.
 * El caller responde 401 cuando es null.
 */
export async function requireApiStaff(): Promise<SessionData | null> {
  return getCurrentStaff();
}

/**
 * Guard para endpoints /api/bot/* — autenticados por clave compartida con n8n,
 * NO por sesión de staff. (header x-bot-key)
 */
export function checkBotKey(req: Request): boolean {
  const key = req.headers.get("x-bot-key");
  const expected = process.env.BOT_API_KEY;
  return Boolean(expected) && key === expected;
}
