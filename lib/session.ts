import type { SessionOptions } from "iron-session";

// Datos que guardamos en la cookie de sesión del CRM.
export interface SessionData {
  staffId?: string;
  email?: string;
  name?: string;
  role?: "ADMIN" | "STAFF";
}

const password = process.env.SESSION_SECRET;

if (!password || password.length < 32) {
  // Falla temprano y claro: iron-session exige >= 32 chars.
  throw new Error(
    "SESSION_SECRET no está definido o tiene menos de 32 caracteres. Configúralo en .env",
  );
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "ayalas_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",
  },
};
