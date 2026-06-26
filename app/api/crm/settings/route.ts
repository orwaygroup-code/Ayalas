import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — config del bot (GymSetting) como objeto clave/valor.
export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = await prisma.gymSetting.findMany({ orderBy: { key: "asc" } });
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;

  return NextResponse.json({ settings });
}

// PUT — upsert de varias claves a la vez. El staff edita las respuestas del
// bot (dirección, horario, mensaje de bienvenida…) sin tocar código.
const putSchema = z.object({
  settings: z.record(z.string().min(1), z.string()),
});

export async function PUT(req: Request) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const entries = Object.entries(parsed.data.settings);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.gymSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );

  return NextResponse.json({ ok: true, updated: entries.length });
}
