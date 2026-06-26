import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBotKey } from "@/lib/auth";
import { normalizeIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

// Identifica la clase por id o por nombre; y el día de la sesión (YYYY-MM-DD).
const schema = z
  .object({
    phone: z.string().min(1),
    plataforma: z
      .enum(["whatsapp", "messenger", "instagram"])
      .default("whatsapp"),
    name: z.string().trim().min(1).optional(), // para crear el invitado
    classId: z.string().optional(),
    className: z.string().trim().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => d.classId || d.className, {
    message: "Se requiere classId o className",
  });

export async function POST(req: Request) {
  if (!checkBotKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { phone, plataforma, name, classId, className, date } = parsed.data;

  // 1) Resolver la clase.
  const gymClass = classId
    ? await prisma.gymClass.findFirst({ where: { id: classId, isActive: true } })
    : await prisma.gymClass.findFirst({
        where: { name: className, isActive: true },
      });
  if (!gymClass) {
    return NextResponse.json(
      { ok: false, reason: "CLASS_NOT_FOUND", message: "No encontré esa clase." },
      { status: 404 },
    );
  }

  const sessionDate = new Date(`${date}T00:00:00.000Z`);

  // 2) Cupo (antes de tocar al socio/invitado, para no crear invitados huérfanos).
  const taken = await prisma.classBooking.count({
    where: { classId: gymClass.id, date: sessionDate, status: { not: "CANCELADA" } },
  });
  if (taken >= gymClass.capacity) {
    return NextResponse.json({
      ok: false,
      reason: "FULL",
      message: `La clase de ${gymClass.name} ya está llena para esa fecha.`,
    });
  }

  // 3) Elegibilidad por estado del contacto.
  const identity = normalizeIdentity(phone, plataforma);
  let member = await prisma.member.findUnique({ where: { phone: identity } });
  let isTrial = false;

  if (!member) {
    // Primera vez: clase muestra → se crea como INVITADO.
    member = await prisma.member.create({
      data: { name: name ?? "Invitado", phone: identity, status: "INVITADO" },
    });
    isTrial = true;
  } else if (member.status === "CONGELADO") {
    return NextResponse.json({
      ok: false,
      reason: "FROZEN",
      message: "Tu membresía está congelada. Reactívala para reservar.",
    });
  } else if (member.status === "CANCELADO") {
    return NextResponse.json({
      ok: false,
      reason: "MEMBERSHIP_REQUIRED",
      message: "Tu membresía está cancelada. Hazte socio para reservar.",
    });
  } else if (member.status === "INVITADO") {
    // Ya es invitado: solo puede reservar si aún no usó su clase muestra.
    const prior = await prisma.classBooking.count({
      where: { memberId: member.id },
    });
    if (prior > 0) {
      return NextResponse.json({
        ok: false,
        reason: "MEMBERSHIP_REQUIRED",
        message:
          "Ya usaste tu clase muestra. Hazte socio para reservar más clases.",
      });
    }
    isTrial = true;
  }
  // status ACTIVO → reserva normal.

  // 4) Crear la reserva.
  const booking = await prisma.classBooking.create({
    data: {
      memberId: member.id,
      classId: gymClass.id,
      date: sessionDate,
      status: "RESERVADA",
    },
  });

  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    isTrial,
    spotsLeft: Math.max(0, gymClass.capacity - taken - 1),
    message: isTrial
      ? `¡Listo! Te aparté un lugar de cortesía en ${gymClass.name}. Para próximas reservas necesitarás hacerte socio.`
      : `¡Listo! Reservé tu lugar en ${gymClass.name}.`,
  });
}
