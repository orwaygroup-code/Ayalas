import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // día de la sesión
});

// GET /api/bot/classes[?date=YYYY-MM-DD]
// Sin date: catálogo de clases activas.
// Con date: clases de ese día de la semana + lugares disponibles para esa fecha.
export async function GET(req: Request) {
  if (!checkBotKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Fecha inválida (usa YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  const { date } = parsed.data;

  const classes = await prisma.gymClass.findMany({
    where: { isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  // Sin fecha: solo el catálogo.
  if (!date) {
    return NextResponse.json({
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        instructor: c.instructor,
        room: c.room,
        capacity: c.capacity,
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        durationMin: c.durationMin,
      })),
    });
  }

  // Con fecha: filtra por día de la semana y calcula cupo disponible.
  const sessionDate = new Date(`${date}T00:00:00.000Z`);
  const weekday = sessionDate.getUTCDay(); // 0=domingo … 6=sábado

  const ofDay = classes.filter((c) => c.dayOfWeek === weekday);

  const withAvailability = await Promise.all(
    ofDay.map(async (c) => {
      const taken = await prisma.classBooking.count({
        where: {
          classId: c.id,
          date: sessionDate,
          status: { not: "CANCELADA" },
        },
      });
      return {
        id: c.id,
        name: c.name,
        instructor: c.instructor,
        room: c.room,
        startTime: c.startTime,
        durationMin: c.durationMin,
        capacity: c.capacity,
        spotsLeft: Math.max(0, c.capacity - taken),
      };
    }),
  );

  return NextResponse.json({ date, classes: withAvailability });
}
