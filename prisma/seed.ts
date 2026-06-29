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

  // ── Datos de MUESTRA (ficticios) — solo si SEED_SAMPLE=true (dev/demo) ──
  // En PRODUCCIÓN no se siembran, para no ensuciar el CRM del cliente con
  // socios/leads/conversaciones falsos.
  const seedSample = process.env.SEED_SAMPLE === "true";

  // ── Socios de ejemplo (hardcodeados) ──
  // `login: true` ⇒ se les setea passwordHash: simulan socios con acceso a un
  // futuro portal/app del gimnasio (login por phone o email + contraseña).
  // Contraseña de ejemplo para esos: "Socio1234".
  if (seedSample) {
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
  } // fin datos de muestra: socios

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

  // ── Datos demo de VOLUMEN (para que la app se vea con flujo) ──
  // Idempotente: se siembra una sola vez (marca GymSetting "demo_seeded").
  const demoMarker = await prisma.gymSetting.findUnique({
    where: { key: "demo_seeded" },
  });
  if (seedSample && !demoMarker) {
    const socioPass = await bcrypt.hash("Socio1234", 10);
    const rnd = (n: number) => Math.floor(Math.random() * n);
    const pick = <T>(a: readonly T[]): T => a[rnd(a.length)];
    const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
    const nextDow = (dow: number) => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + ((dow - d.getUTCDay() + 7) % 7));
      return d;
    };

    const planRows = await prisma.membershipPlan.findMany();
    const classRows = await prisma.gymClass.findMany();
    const tagRows = await prisma.tag.findMany();
    const tagByName = (n: string) => tagRows.find((t) => t.name === n);

    // Socios extra (volumen en /crm/socios)
    const extraSocios = [
      { name: "Roberto Silva", status: "ACTIVO", login: true, plan: "Mensual" },
      { name: "Gabriela Luna", status: "ACTIVO", login: false, plan: "Anual" },
      { name: "Óscar Pinto", status: "ACTIVO", login: false, plan: "Mensual" },
      { name: "Natalia Cordero", status: "CONGELADO", login: false, plan: "Trimestral" },
      { name: "Pablo Domínguez", status: "ACTIVO", login: true, plan: "Mensual" },
      { name: "Mónica Salas", status: "CANCELADO", login: false, plan: null },
    ] as const;
    for (let i = 0; i < extraSocios.length; i++) {
      const s = extraSocios[i];
      const mem = await prisma.member.create({
        data: {
          name: s.name,
          phone: `5570${String(300000 + i).slice(-6)}`,
          email: `socio${i}@ayalas.mx`,
          status: s.status,
          passwordHash: s.login ? socioPass : null,
          joinedAt: daysAgo(rnd(180)),
        },
      });
      if (s.plan) {
        const pl = planRows.find((p) => p.name === s.plan);
        if (pl) {
          const start = daysAgo(rnd(60));
          const ms = await prisma.membership.create({
            data: {
              memberId: mem.id,
              planId: pl.id,
              startDate: start,
              endDate: new Date(start.getTime() + pl.durationDays * 86400000),
              paymentStatus: "PAGADO",
            },
          });
          await prisma.payment.create({
            data: { memberId: mem.id, membershipId: ms.id, amount: pl.price, method: "EFECTIVO" },
          });
        }
      }
    }

    // Leads (volumen para el embudo + curva de 30 días)
    const leadNames = [
      "Sofía Herrera", "Diego Castro", "Valeria Ruiz", "Mateo Flores", "Camila Ortiz",
      "Sebastián Cruz", "Renata Vega", "Emiliano Ríos", "Regina Mora", "Andrés Lara",
      "Ximena Soto", "Leonardo Peña", "Daniela Campos", "Gael Núñez", "Isabela Reyes",
      "Nicolás Ibarra", "Fernanda Cano", "Adrián Solís", "Paula Vargas", "Bruno Téllez",
      "Mariana Gil", "Ángel Rivas", "Lía Estrada", "Hugo Bravo", "Jimena Acosta", "Iván Robles",
    ];
    const sources = ["whatsapp", "instagram", "messenger", "referido"] as const;
    const leadStatuses = ["NUEVO", "NUEVO", "NUEVO", "CONTACTADO", "CONTACTADO", "CONVERTIDO", "PERDIDO"] as const;
    for (let i = 0; i < leadNames.length; i++) {
      const created = daysAgo(rnd(30));
      await prisma.lead.create({
        data: {
          name: leadNames[i],
          phone: `5590${String(100000 + i).slice(-6)}`,
          source: pick(sources),
          status: pick(leadStatuses),
          interestedPlanId: rnd(2) === 0 && planRows.length ? pick(planRows).id : null,
          createdAt: created,
          updatedAt: created,
        },
      });
    }

    // Conversaciones + mensajes (Inbox) con algunos tags
    const plats = ["whatsapp", "instagram", "messenger"] as const;
    const inbound = [
      "Hola, ¿qué precio tiene la mensualidad?", "¿Tienen clase de spinning?",
      "¿Cuál es el horario?", "Quiero info de planes", "¿Dónde están ubicados?",
      "¿Hay promoción este mes?", "¿Puedo ir a una clase muestra?",
    ];
    const outbound = [
      "¡Hola! Con gusto te comparto la info 💪", "El plan Mensual cuesta $600.",
      "Abrimos de 6am a 10pm de lunes a viernes.", "¡Te esperamos! ¿Agendamos una visita?",
      "Claro, te aparto un lugar en la clase muestra.",
    ];
    for (let i = 0; i < 16; i++) {
      const plat = pick(plats);
      const updated = daysAgo(rnd(14));
      const conv = await prisma.whatsAppConversation.create({
        data: {
          phone: `5580${String(200000 + i).slice(-6)}`,
          createdAt: daysAgo(rnd(20) + 14),
          updatedAt: updated,
        },
      });
      const n = 2 + rnd(3);
      await prisma.whatsAppMessage.createMany({
        data: Array.from({ length: n }, (_, j) => ({
          conversationId: conv.id,
          direction: j % 2 === 0 ? "INBOUND" : ("OUTBOUND" as const),
          body: j % 2 === 0 ? pick(inbound) : pick(outbound),
          plataforma: plat,
          sentAt: new Date(updated.getTime() - (n - j) * 60000),
        })),
      });
      if (rnd(2) === 0 && tagRows.length) {
        await prisma.conversationTag.create({
          data: { conversationId: conv.id, tagId: pick(tagRows).id, source: "MANUAL" },
        });
      }
    }

    // Reservas (ocupación de clases) + asistencia
    const activeMembers = await prisma.member.findMany({ where: { status: "ACTIVO" } });
    for (const cls of classRows) {
      const next = nextDow(cls.dayOfWeek ?? 1);
      const prev = new Date(next.getTime() - 7 * 86400000);
      for (const mem of activeMembers) {
        if (rnd(2) === 0)
          await prisma.classBooking.create({
            data: { memberId: mem.id, classId: cls.id, date: next, status: "RESERVADA" },
          });
        if (rnd(2) === 0)
          await prisma.classBooking.create({
            data: { memberId: mem.id, classId: cls.id, date: prev, status: "ASISTIO" },
          });
      }
    }
    for (const mem of activeMembers) {
      const n = 1 + rnd(4);
      for (let k = 0; k < n; k++)
        await prisma.attendance.create({
          data: { memberId: mem.id, checkinAt: daysAgo(rnd(14)) },
        });
    }

    // Marketing: una campaña COMPLETED (con progreso) + un borrador
    const leadTag = tagByName("Lead nuevo");
    const filters = { tagIds: leadTag ? [leadTag.id] : [], mode: "any", source: "conv" };
    const camp = await prisma.marketingCampaign.create({
      data: {
        name: "Reactivación de mayo", templateName: "reactivacion_mayo",
        templateLanguage: "es_MX", templateParams: {}, filters,
        status: "COMPLETED", totalTargets: 8, sentCount: 7, failedCount: 1,
        startedAt: daysAgo(6), completedAt: daysAgo(6), createdAt: daysAgo(7),
      },
    });
    await prisma.marketingCampaignTarget.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        campaignId: camp.id,
        phone: `5580${String(200000 + i).slice(-6)}`,
        status: i < 7 ? "SENT" : ("FAILED" as const),
        mid: i < 7 ? `wamid.demo${i}` : null,
        sentAt: i < 7 ? daysAgo(6) : null,
        errorMessage: i < 7 ? null : "número inválido",
      })),
    });
    await prisma.marketingCampaign.create({
      data: {
        name: "Promo verano (borrador)", templateName: "promo_verano",
        templateParams: {}, filters, status: "DRAFT",
      },
    });

    await prisma.gymSetting.create({
      data: { key: "demo_seeded", value: new Date().toISOString() },
    });
    console.log("✓ Datos demo de volumen sembrados (leads, inbox, socios, reservas, campañas)");
  } else {
    console.log("• Datos de muestra omitidos (SEED_SAMPLE!=true o ya sembrados)");
  }

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
