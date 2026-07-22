import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — lista de profesores con sus clases activas (nombre, día, hora, área).
export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const instructors = await prisma.instructor.findMany({
    orderBy: { name: "asc" },
    include: {
      classes: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          room: true,
          dayOfWeek: true,
          startTime: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  return NextResponse.json({
    instructors: instructors.map((i) => ({
      id: i.id,
      name: i.name,
      specialty: i.specialty,
      isActive: i.isActive,
      classCount: i.classes.length,
      classes: i.classes,
    })),
  });
}

const postSchema = z.object({
  name: z.string().trim().min(1),
  specialty: z.string().trim().optional(),
});

// POST — alta de profesor.
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

  const instructor = await prisma.instructor.create({ data: parsed.data });
  return NextResponse.json({ instructor: { id: instructor.id } });
}
