import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Base de conocimiento que n8n inyecta en el prompt del LLM para Info 24/7:
// config editable (GymSetting) + planes y clases activos. Protegido por x-bot-key.
export async function GET(req: Request) {
  if (!checkBotKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [settings, plans, classes] = await Promise.all([
    prisma.gymSetting.findMany(),
    prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    }),
    prisma.gymClass.findMany({ where: { isActive: true } }),
  ]);

  const settingsObj: Record<string, string> = {};
  for (const s of settings) settingsObj[s.key] = s.value;

  return NextResponse.json({
    settings: settingsObj,
    plans: plans.map((p) => ({
      name: p.name,
      description: p.description,
      price: Number(p.price), // Decimal → number para el JSON
      durationDays: p.durationDays,
      benefits: p.benefits,
    })),
    classes: classes.map((c) => ({
      name: c.name,
      instructor: c.instructor,
      room: c.room,
      capacity: c.capacity,
      dayOfWeek: c.dayOfWeek, // 0=domingo … 6=sábado
      startTime: c.startTime,
      durationMin: c.durationMin,
    })),
  });
}
