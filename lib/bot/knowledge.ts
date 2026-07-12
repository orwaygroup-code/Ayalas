import { prisma } from "@/lib/prisma";

// Datos DINÁMICOS del gimnasio (editables por el staff en /crm/configuracion y en
// los módulos de planes/clases). Compartido por /api/bot/info y /api/bot/prompt para
// no duplicar las queries. La persona/guardrails (lo estático) vive en persona.ts.

export type GymFacts = {
  settings: Record<string, string>;
  plans: {
    name: string;
    description: string | null;
    price: number;
    durationDays: number;
    benefits: string | null;
  }[];
  classes: {
    name: string;
    instructor: string | null;
    room: string | null;
    capacity: number;
    dayOfWeek: number | null; // 0=domingo … 6=sábado
    startTime: string | null;
    durationMin: number;
  }[];
};

export async function getGymFacts(): Promise<GymFacts> {
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

  return {
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
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      durationMin: c.durationMin,
    })),
  };
}
