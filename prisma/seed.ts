import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Admin inicial (personal del gym que entra al CRM) ──
  const email = (process.env.ADMIN_EMAIL ?? "admin@ayalas.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "cambiame";
  const name = process.env.ADMIN_NAME ?? "Administrador Ayalas";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.staff.upsert({
    where: { email },
    update: { name, passwordHash, isActive: true, role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN" },
  });
  console.log(`✓ Admin listo: ${email}`);

  // ── Planes de ejemplo (editables después) ──
  const plans = [
    { name: "Mensual", price: 600, durationDays: 30, benefits: "Acceso completo al gym" },
    { name: "Trimestral", price: 1500, durationDays: 90, benefits: "Acceso completo + 1 clase grupal/semana" },
    { name: "Anual", price: 5400, durationDays: 365, benefits: "Acceso completo + clases ilimitadas" },
  ];
  for (const p of plans) {
    const existing = await prisma.membershipPlan.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.membershipPlan.create({ data: p });
    }
  }
  console.log(`✓ Planes de ejemplo: ${plans.map((p) => p.name).join(", ")}`);

  // ── Clases de ejemplo (reservables) ──
  const classes = [
    { name: "Spinning", instructor: "Coach Ayala", room: "Sala A", capacity: 20, dayOfWeek: 1, startTime: "07:00" },
    { name: "Yoga", instructor: "Coach Luna", room: "Sala B", capacity: 15, dayOfWeek: 3, startTime: "19:00" },
    { name: "Funcional", instructor: "Coach Rex", room: "Sala A", capacity: 18, dayOfWeek: 5, startTime: "18:00" },
  ];
  for (const c of classes) {
    const existing = await prisma.gymClass.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.gymClass.create({ data: c });
    }
  }
  console.log(`✓ Clases de ejemplo: ${classes.map((c) => c.name).join(", ")}`);

  // ── Tags base para segmentar ──
  const tags = [
    { name: "Lead nuevo", color: "blue" },
    { name: "Socio activo", color: "green" },
    { name: "Inactivo", color: "amber" },
    { name: "Interesado en clases", color: "violet" },
  ];
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log(`✓ Tags base: ${tags.map((t) => t.name).join(", ")}`);

  // ── Socios de ejemplo (hardcodeados) ──
  // `login: true` ⇒ se les setea passwordHash: simulan socios con acceso a un
  // futuro portal/app del gimnasio (login por phone o email + contraseña).
  // Contraseña de ejemplo para esos: "Socio1234".
  const socioPass = await bcrypt.hash("Socio1234", 10);
  const members = [
    { name: "María González", phone: "5511002001", email: "maria.gonzalez@ayalas.mx", status: "ACTIVO", login: true, plan: "Mensual" },
    { name: "Juan Pérez", phone: "5511002002", email: "juan.perez@ayalas.mx", status: "ACTIVO", login: true, plan: "Anual" },
    { name: "Lucía Ramírez", phone: "5511002003", email: "lucia.ramirez@ayalas.mx", status: "CONGELADO", login: false, plan: "Trimestral" },
    { name: "Carlos Méndez", phone: "5511002004", email: "carlos.mendez@ayalas.mx", status: "ACTIVO", login: false, plan: "Mensual" },
    { name: "Ana Torres", phone: "5511002005", email: "ana.torres@ayalas.mx", status: "CANCELADO", login: false, plan: null },
  ] as const;

  for (const m of members) {
    const member = await prisma.member.upsert({
      where: { phone: m.phone },
      update: {
        name: m.name,
        email: m.email,
        status: m.status,
        passwordHash: m.login ? socioPass : null,
      },
      create: {
        name: m.name,
        phone: m.phone,
        email: m.email,
        status: m.status,
        passwordHash: m.login ? socioPass : null,
      },
    });

    // Membresía activa + pago para quien tenga plan (idempotente).
    if (m.plan) {
      const plan = await prisma.membershipPlan.findFirst({ where: { name: m.plan } });
      const existing = await prisma.membership.findFirst({ where: { memberId: member.id } });
      if (plan && !existing) {
        const start = new Date();
        const end = new Date(start.getTime() + plan.durationDays * 86400000);
        const membership = await prisma.membership.create({
          data: {
            memberId: member.id,
            planId: plan.id,
            startDate: start,
            endDate: end,
            paymentStatus: "PAGADO",
          },
        });
        await prisma.payment.create({
          data: {
            memberId: member.id,
            membershipId: membership.id,
            amount: plan.price,
            method: "EFECTIVO",
          },
        });
      }
    }
  }
  console.log(`✓ Socios de ejemplo: ${members.length} (2 con acceso/login)`);

  // ── Config del bot (Info 24/7) — editable sin tocar código ──
  const settings: Record<string, string> = {
    gym_name: "Gimnasio Ayalas",
    address: "Pendiente — capturar dirección real",
    hours: "Lun-Vie 6:00–22:00 · Sáb 8:00–14:00 · Dom cerrado",
    phone: "Pendiente — número de contacto",
    welcome_message: "¡Hola! 👋 Bienvenido a Gimnasio Ayalas. ¿Te interesa información de planes, clases o ubicación?",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.gymSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log(`✓ Config del bot (GymSetting): ${Object.keys(settings).length} claves`);

  console.log("\nSeed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
