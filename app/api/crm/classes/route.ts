import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — todas las sesiones activas del horario, con su profesor. Alimenta el
// calendario semanal (agrupado por área/día/hora en el front).
export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const classes = await prisma.gymClass.findMany({
    where: { isActive: true },
    include: { instructor: { select: { id: true, name: true } } },
    orderBy: [{ room: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      room: c.room,
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      durationMin: c.durationMin,
      capacity: c.capacity,
      instructorId: c.instructorId,
      instructorName: c.instructor?.name ?? null,
    })),
  });
}

const postSchema = z.object({
  name: z.string().trim().min(1),
  room: z.string().trim().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  instructorId: z.string().nullable().optional(),
});

// POST — crear una sesión en el horario.
export async function POST(req: Request) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const gymClass = await prisma.gymClass.create({ data: parsed.data });
  return NextResponse.json({ class: { id: gymClass.id } });
}
