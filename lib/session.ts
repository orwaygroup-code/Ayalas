import type { SessionOptions } from "iron-session";

// Datos que guardamos en la cookie de sesión del CRM.
export interface SessionData {
  staffId?: string;
  email?: string;
  name?: string;
  role?: "ADMIN" | "STAFF";
}

// El secreto se valida de forma PEREZOSA (al construir las opciones, en cada
// request), NO al importar el módulo. Si se validara al importar, `next build`
// (y por ende `docker build`) tronaría porque en build no hay SESSION_SECRET.
export function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET no está definido o tiene menos de 32 caracteres. Configúralo en .env",
    );
  }
  return {
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
}
