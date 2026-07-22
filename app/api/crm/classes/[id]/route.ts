import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

// El uso principal es asignar/cambiar el profesor de una sesión, pero permite
// editar el resto de campos del horario.
const patchSchema = z.object({
  instructorId: z.string().nullable().optional(), // null = quitar profesor
  name: z.string().trim().min(1).optional(),
  room: z.string().trim().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  durationMin: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const gymClass = await prisma.gymClass.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ class: { id: gymClass.id } });
  } catch {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  }
}

// DELETE — quitar la sesión del horario (soft-delete para no romper reservas
// históricas que la referencien).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await prisma.gymClass.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  }
}
