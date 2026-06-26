import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaff } from "@/lib/auth";
import { filtersSchema, resolveRecipients } from "@/lib/marketing";

export const dynamic = "force-dynamic";

// POST — cuenta destinatarios para unos filtros SIN enviar nada.
// Clave del flujo: ver el alcance antes de gastar plantillas de Meta.
const schema = z.object({ filters: filtersSchema });

export async function POST(req: Request) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const recipients = await resolveRecipients(parsed.data.filters);

  return NextResponse.json({
    count: recipients.length,
    sample: recipients.slice(0, 5).map((r) => r.phone),
  });
}
