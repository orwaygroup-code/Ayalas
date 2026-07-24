/**
 * Seed de datos REALES de Ayala's Wellness 360 (AW360).
 * Puebla BotKnowledge (catalogo del bot) + MembershipPlan (precios) + GymSetting.
 * Idempotente. Se corre DENTRO del contenedor de la app:
 *   docker exec ayalas-ayalas-app-1 node prisma/seed-aw360.cjs
 * Fuente: ayalas.json + flyers + info general (contenido del cliente, jul-2026).
 * Adaptaciones vs los docs originales (decision del cliente):
 *  - Precios y direccion SI se muestran (antes derivaban a asesor).
 *  - Telefono NO se da. Sauna NO se promete. Yoga somatica SI es clase.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ── Catalogo de conocimiento (prosa) ──
const KNOWLEDGE = [
  {
    key: "identidad",
    category: "institucional",
    name: "Identidad y concepto AW360",
    keywords: "aw360,ayalas wellness,concepto,360,quienes son,que es",
    always: true,
    body: "Ayala's Wellness 360 (AW360) es un centro y clinica integral en Aguascalientes. El concepto 360 es un enfoque integral para la salud, el bienestar, el rendimiento fisico y la nutricion: une en un solo lugar el acondicionamiento, la alimentacion y la recuperacion clinica y deportiva. No es un gimnasio convencional de pesas: es una clinica integral.",
  },
  {
    key: "horarios",
    category: "institucional",
    name: "Horarios de atencion",
    keywords: "horario,horarios,a que hora,abren,cierran,domingo,sabado",
    always: true,
    body: "Horario del centro: Lunes a Viernes de 5:00 AM a 12:00 AM (medianoche). Sabados de 7:00 AM a 7:00 PM. Domingos de 8:00 AM a 5:00 PM. Los horarios de cada clase estan disponibles (ver la seccion HORARIO).",
  },
  {
    key: "liderazgo",
    category: "institucional",
    name: "Direccion general (Hilda de Lizaola y Ricardo Ayala)",
    keywords: "hilda,lizaola,ricardo,ayala,directores,fundadores,nutriologo,quien dirige",
    always: false,
    body: "Direccion General de AW360 (menciona a los dos): Hilda de Lizaola, Directora General, cofundadora y Nutriologa Clinica, enfocada en el combate a la obesidad, el funcionamiento metabolico y el control de enfermedades cronico-degenerativas. Ricardo Ayala, Director General, cofundador y Nutriologo de nutricion clinica y deportiva, enfocado en el rendimiento fisico, la hipertrofia y la salud metabolica.",
  },
  {
    key: "indice_servicios",
    category: "institucional",
    name: "Que ofrece AW360",
    keywords: "que ofrecen,servicios,que tienen,disciplinas,clases,actividades,opciones",
    always: false,
    body: "AW360 ofrece: entrenamiento y disciplinas (acondicionamiento, fuerza, resistencia e hipertrofia); Indoor Cycling (Cycling Experience); clases tematicas indoor (Special Events & Rides); Yoga; Yoga Somatica; Yogalatte (yoga + pilates); Barre; Nutricion y asesoria clinica y deportiva; Ayala, Fuel (restaurante con terraza); y Muscle Bar (cafeteria, batidos, proteina y suplementacion).",
  },
  {
    key: "entrenamiento",
    category: "disciplina",
    name: "Area de entrenamiento y disciplinas",
    keywords: "entrenamiento,pesas,fuerza,hipertrofia,acondicionamiento,gym,rutina,entrenar,maquinas",
    always: false,
    body: "Area de Entrenamiento: clases y programas de acondicionamiento fisico, fuerza, resistencia e hipertrofia, guiados por instructores capacitados bajo estandares profesionales.",
  },
  {
    key: "indoor_cycling",
    category: "disciplina",
    name: "Indoor Cycling (Cycling Experience)",
    keywords: "indoor,cycling,spinning,bici,bicicleta,ciclismo,ride,cardio en bici",
    always: false,
    body: "Indoor Cycling - Cycling Experience: un espacio donde te pierdes entre la luz, el neon y la musica; el ejercicio en la bicicleta impacta a otro nivel, una sensacion y una experiencia unicas en el entrenamiento.",
  },
  {
    key: "clases_tematicas",
    category: "disciplina",
    name: "Clases tematicas indoor (Special Events & Rides)",
    keywords: "tematica,special event,evento,ride tematico,clase especial,espectaculo",
    always: false,
    body: "Clases Tematicas Indoor (Special Events & Rides): el entrenamiento se transforma en un espectaculo sensorial donde la energia del grupo se fusiona con la musica, la iluminacion inmersiva y una tematica renovada en cada sesion. Una experiencia vibrante para motivarte al limite.",
  },
  {
    key: "yoga",
    category: "disciplina",
    name: "Yoga",
    keywords: "yoga,aromaterapia,respiracion,meditacion,relajacion,equilibrio,estiramiento",
    always: false,
    body: "Yoga: una atmosfera para el reencuentro interior, donde la aromaterapia guia hacia la relajacion profunda, el control y el equilibrio. Con tecnicas de respiracion y conciencia corporal integra mente, cuerpo y espiritu.",
  },
  {
    key: "yoga_somatica",
    category: "disciplina",
    name: "Yoga Somatica",
    keywords: "somatica,yoga somatica,propiocepcion,sistema nervioso,liberar tension",
    always: false,
    body: "Yoga Somatica: practica consciente que va mas alla de las posturas tradicionales. Ensena a escuchar tu cuerpo, liberar el estres almacenado en el sistema nervioso y reprogramar patrones de movimiento con respiracion profunda. Un espacio de autodescubrimiento que devuelve movilidad, ligereza y paz interior. Si es una clase que se imparte en AW360.",
  },
  {
    key: "yogalatte",
    category: "disciplina",
    name: "Yogalatte (yoga + pilates)",
    keywords: "yogalatte,pilates,core,postura,flexibilidad,bajo impacto,tonificar",
    always: false,
    body: "Yogalatte: combina la fluidez, la respiracion y la conciencia del yoga con la fuerza, la estabilidad y la tonificacion del pilates. Movimientos controlados y de bajo impacto que trabajan cada grupo muscular desde el centro, mejoran la postura e incrementan la flexibilidad.",
  },
  {
    key: "barre",
    category: "disciplina",
    name: "Barre",
    keywords: "barre,ballet,barra,tonificar,isometrico,piernas,gluteos,esculpir",
    always: false,
    body: "Barre: fusiona la elegancia del ballet, la precision del pilates y la fuerza del yoga. Movimientos isometricos y controlados en la barra, de bajo impacto, que esculpen, tonifican y alargan sin agredir las articulaciones. Un centro fuerte, piernas definidas y postura imponente.",
  },
  {
    key: "faq_yoga_somatica",
    category: "faq",
    name: "Diferencia entre yoga tradicional y yoga somatica",
    keywords: "diferencia entre yoga,hatha,vinyasa,ashtanga,que es yoga somatica",
    always: false,
    body: "Diferencia: el yoga tradicional (Hatha, Vinyasa, Ashtanga) busca flexibilidad, fuerza, equilibrio y quietud mediante posturas, con atencion a la alineacion y la respiracion. El yoga somatica reeduca el sistema nervioso, libera tensiones cronicas y fomenta la autoexploracion, con atencion 100% interna a las sensaciones del cuerpo, ritmo lento y sin buscar estetica. En AW360 se imparten ambas.",
  },
  {
    key: "nutricion",
    category: "servicio",
    name: "Nutricion y asesoria especializada",
    keywords: "nutricion,nutriologo,dieta,plan alimenticio,bajar de peso,consulta,valoracion,composicion corporal",
    always: false,
    body: "Area de Nutricion y Asesoria Especializada: te ayudamos a encontrar una alimentacion equilibrada, a comer para nutrir tu organismo y no solo para llenarlo. La direccion clinica esta a cargo de la nutriologa Hilda de Lizaola y el nutriologo deportivo Ricardo Ayala. (Para agendar una consulta, pide nombre y marca intent lead.)",
  },
  {
    key: "ayala_fuel",
    category: "servicio",
    name: "Ayala, Fuel (restaurante)",
    keywords: "restaurante,ayala fuel,fuel,comer,comida,menu,desayuno,platillo,cocina",
    always: false,
    body: "Ayala, Fuel (restaurante oficial): un concepto gastronomico para nutrirte, impulsarte y consentirte sin culpa, con menu de alimentacion saludable, balanceada y de alto valor nutricional. Cuidarse tambien sabe increible. El menu especifico no esta en sistema.",
  },
  {
    key: "terraza",
    category: "servicio",
    name: "Terraza de Ayala, Fuel",
    keywords: "terraza,aire libre,vista,rooftop,trabajar,ambiente",
    always: false,
    body: "Terraza de Ayala, Fuel: espacio al aire libre con vista urbana. Ideal para recargar despues de entrenar, trabajar un rato o convivir con amigos. Ambiente relajado y con estilo, atencion de primer nivel y menu con opciones saludables o algun antojo.",
  },
  {
    key: "muscle_bar",
    category: "servicio",
    name: "Muscle Bar (cafeteria y batidos)",
    keywords: "muscle bar,batido,smoothie,cafe,cafeteria,proteina,suplemento,shake,post entreno",
    always: false,
    body: "Muscle Bar: barra especializada en bebidas funcionales, smoothies energeticos, proteina y suplementacion inteligente.",
  },
  {
    key: "servicio_experiencia",
    category: "institucional",
    name: "Experiencia y atencion",
    keywords: "atencion,servicio,experiencia,instalaciones,equipo,trato,acompanamiento",
    always: false,
    body: "En AW360 la prioridad eres tu. Atencion de primer nivel desde el primer instante, con personal calificado y especializado por disciplina, respaldado por la direccion clinica de Hilda de Lizaola y Ricardo Ayala, en instalaciones con equipo de vanguardia.",
  },
  {
    key: "campeones",
    category: "institucional",
    name: "Entrenar con campeones",
    keywords: "campeon,campeones,mr mexico,ifbb,competidor,fisicoculturismo,por que ustedes,diferencia con otros gimnasios",
    always: false,
    body: "Diferenciador: AW360 es el unico centro y clinica en Aguascalientes donde entrenas, convives y aprendes de campeones reales, referentes nacionales. Bajo la direccion se han forjado Mr. Mexico absolutos y campeones IFBB Pro, ademas de una amplia cartera de competidores Top Ten nacional. Aqui la jerarquia se queda en el vestidor: todos estan listos para ayudarte y entrenar contigo.",
  },
  {
    key: "inclusion",
    category: "institucional",
    name: "Para quien es AW360",
    keywords: "principiante,empezar,nunca he,adulto mayor,tercera edad,edad,sobrepeso,pena,puedo ir,es para mi,empezar de cero",
    always: false,
    body: "AW360 es para todos, sin importar tu condicion fisica actual. No es un gimnasio de pesas y fierros: es una clinica integral. Hay espacio a la medida desde adolescentes que buscan buenos habitos hasta adultos mayores que necesitan activacion fisica y movilidad. Ambiente humano, profesional y sin juicios, sin estereotipos ni barreras.",
  },
  {
    key: "convenios",
    category: "institucional",
    name: "Convenios (universidades y empresas)",
    keywords:
      "convenio,convenios,universidad,universidades,empresa,empresas,trabajadores,descuento corporativo,global university,rrhh,corporativo",
    always: false,
    body: "Si, AW360 maneja convenios con universidades (por ejemplo, Global University) y con empresas para descuentos a sus trabajadores. Para conocer los convenios vigentes o sumar a tu empresa o institucion, pide el nombre de la persona y de la empresa/universidad y deriva a un asesor. Marca intent = lead.",
  },
  {
    key: "precios_planes",
    category: "politica",
    name: "Precios y planes",
    keywords: "precio,precios,costo,cuanto cuesta,mensualidad,membresia,paquete,plan,tarifa,promocion,inscripcion,visita,clase muestra",
    always: true,
    body: "REGLA INTERNA: los precios de membresias y paquetes SI estan disponibles: compartelos con el cliente desde la seccion PLANES Y PRECIOS. Para promociones vigentes, formas de pago o dudas de facturacion, ofrece que un asesor confirme el detalle, pide nombre y servicio de interes, y marca intent = lead.",
  },
  {
    key: "contacto_ubicacion",
    category: "politica",
    name: "Ubicacion y contacto",
    keywords: "direccion,donde estan,ubicacion,como llego,mapa,telefono,numero,estacionamiento,calle",
    always: true,
    body: "REGLA INTERNA: la direccion SI se da: Colosio 324, Aguascalientes. El TELEFONO no se comparte: pide el nombre del cliente y el servicio de interes, di que un asesor lo contacta y marca intent = lead.",
  },
  {
    key: "reservas",
    category: "politica",
    name: "Reservas y agendado de clases",
    keywords: "agendar,reservar,apartar,lugar,cupo,inscribirme,disponibilidad,a que hora es la clase,calendario",
    always: true,
    body: "REGLA INTERNA: los HORARIOS de clase SI estan (seccion HORARIO): dalos con confianza. Lo que NO esta es el cupo/disponibilidad en tiempo real ni el nombre del instructor. Para apartar un lugar, di que un asesor cierra la reserva y marca intent = booking llenando booking.className y booking.date con lo que la persona haya dicho.",
  },
];

// ── Planes (MembershipPlan) ──
const PLANS = [
  {
    name: "Paquete Absoluto",
    description: "Membresia completa (mensualidad principal).",
    price: 1250,
    durationDays: 30,
    benefits:
      "Inscripcion $350. Incluye clases ilimitadas, area de pesas y cardio (equipo de ultima generacion), zona wellness (regaderas) y Checklist de Salud 360 (nutricion, psicologia y kinesiologia). Bono: 1 playera de regalo y 1 batido de proteina gratis al mes.",
  },
  {
    name: "Paquete Fundador",
    description: "Membresia fundadora, tarifa congelada de por vida.",
    price: 950,
    durationDays: 30,
    benefits:
      "Exclusivo Colosio. Tarifa congelada de por vida con pago puntual. Inscripcion $450 (pago unico). Incluye area de pesas y cardio, zona wellness (regaderas), Checklist de Salud 360 (nutricion, psicologia y kinesiologia) y sesiones de salud mensuales. No incluye clases.",
  },
  {
    name: "Paquete 0 Excusas",
    description: "Solo pesas y cardio.",
    price: 680,
    durationDays: 30,
    benefits:
      "Solo pesas. Incluye todos los aparatos, area de cardio y uso de area de banos. No incluye area clinica ni clases o disciplinas.",
  },
  {
    name: "Clase muestra",
    description: "Paquete de clases.",
    price: 100,
    durationDays: 7,
    benefits: "Una clase de prueba. Vigencia 7 dias. No transferible ni reembolsable.",
  },
  {
    name: "1 Clase",
    description: "Paquete de clases.",
    price: 115,
    durationDays: 7,
    benefits: "Una clase. Vigencia 7 dias. No transferible ni reembolsable.",
  },
  {
    name: "5 Clases",
    description: "Paquete de clases.",
    price: 499,
    durationDays: 20,
    benefits: "5 clases. Vigencia 20 dias. No transferible ni reembolsable.",
  },
  {
    name: "10 Clases",
    description: "Paquete de clases.",
    price: 750,
    durationDays: 30,
    benefits: "10 clases. Vigencia 30 dias. No transferible ni reembolsable.",
  },
  {
    name: "15 Clases",
    description: "Paquete de clases.",
    price: 950,
    durationDays: 30,
    benefits: "15 clases. Vigencia 30 dias. No transferible ni reembolsable.",
  },
  {
    name: "Clases Ilimitado",
    description: "Paquete de clases (solo clases).",
    price: 1250,
    durationDays: 30,
    benefits:
      "Clases ilimitadas. Vigencia 30 dias. Solo clases; no incluye la membresia Absoluto. No transferible ni reembolsable.",
  },
];

// ── Horario semanal real (2 areas). Dia: 1=Lun ... 6=Sab. Instructor se asigna
//    despues desde el CRM (queda null aqui). ──
const INDOOR = "Salón Indoor";
const USOS = "Salón Usos Múltiples";
const SCHEDULE = [
  // Salon Indoor (Bici)
  { name: "RPM", room: INDOOR, dayOfWeek: 1, startTime: "18:00" },
  { name: "Indoor", room: INDOOR, dayOfWeek: 2, startTime: "06:00" },
  { name: "RPM", room: INDOOR, dayOfWeek: 2, startTime: "18:00" },
  { name: "Indoor", room: INDOOR, dayOfWeek: 3, startTime: "06:00" },
  { name: "RPM", room: INDOOR, dayOfWeek: 3, startTime: "18:00" },
  { name: "Indoor", room: INDOOR, dayOfWeek: 4, startTime: "06:00" },
  { name: "RPM", room: INDOOR, dayOfWeek: 4, startTime: "18:00" },
  { name: "Indoor", room: INDOOR, dayOfWeek: 4, startTime: "19:00" },
  { name: "Indoor", room: INDOOR, dayOfWeek: 5, startTime: "08:00" },
  { name: "RPM", room: INDOOR, dayOfWeek: 5, startTime: "18:00" },
  { name: "Clase temática", room: INDOOR, dayOfWeek: 6, startTime: "09:30" },
  // Salon Usos Multiples
  { name: "Yogalattes", room: USOS, dayOfWeek: 1, startTime: "17:00" },
  { name: "Barre", room: USOS, dayOfWeek: 1, startTime: "18:00" },
  { name: "Yoga Somática", room: USOS, dayOfWeek: 2, startTime: "09:00" },
  { name: "Barre", room: USOS, dayOfWeek: 2, startTime: "18:00" },
  { name: "Yoga", room: USOS, dayOfWeek: 3, startTime: "07:00" },
  { name: "Yoga", room: USOS, dayOfWeek: 3, startTime: "08:30" },
  { name: "Yogalattes", room: USOS, dayOfWeek: 3, startTime: "17:00" },
  { name: "Barre", room: USOS, dayOfWeek: 3, startTime: "18:00" },
  { name: "Yoga Somática", room: USOS, dayOfWeek: 4, startTime: "09:00" },
  { name: "Barre", room: USOS, dayOfWeek: 4, startTime: "18:00" },
  { name: "Yoga", room: USOS, dayOfWeek: 5, startTime: "07:00" },
  { name: "Yoga", room: USOS, dayOfWeek: 5, startTime: "08:30" },
  { name: "Barre", room: USOS, dayOfWeek: 5, startTime: "18:00" },
];

// ── Profesores placeholder: 2 por grupo de disciplina. El staff los renombra
//    y reasigna despues desde el CRM. ──
const INSTRUCTORS = [
  { name: "Profesor Indoor 1", specialty: "Indoor / RPM" },
  { name: "Profesor Indoor 2", specialty: "Indoor / RPM" },
  { name: "Profesor Yoga 1", specialty: "Yoga / Somática / Yogalattes" },
  { name: "Profesor Yoga 2", specialty: "Yoga / Somática / Yogalattes" },
  { name: "Profesor Barre 1", specialty: "Barre" },
  { name: "Profesor Barre 2", specialty: "Barre" },
];
// A que grupo pertenece cada clase (para asignar el par de profesores).
const GROUP = {
  RPM: "indoor",
  Indoor: "indoor",
  "Clase temática": "indoor",
  Yoga: "yoga",
  "Yoga Somática": "yoga",
  Yogalattes: "yoga",
  Barre: "barre",
};
const POOL = {
  indoor: ["Profesor Indoor 1", "Profesor Indoor 2"],
  yoga: ["Profesor Yoga 1", "Profesor Yoga 2"],
  barre: ["Profesor Barre 1", "Profesor Barre 2"],
};

// ── Settings ──
const SETTINGS = {
  gym_name: "Ayala's Wellness 360 (AW360)",
  address: "Colosio 324, Aguascalientes",
  phone: "",
  hours:
    "Lunes a viernes 5:00 a.m. a 12:00 a.m. (medianoche); Sabado 7:00 a.m. a 7:00 p.m.; Domingo y feriados 8:00 a.m. a 5:00 p.m.",
  welcome_message:
    "Hola, bienvenido a Ayala's Wellness 360. Con gusto te doy informacion de nuestras disciplinas, planes y servicios. Que te gustaria saber?",
};

async function main() {
  // 1) Catalogo de conocimiento
  for (const k of KNOWLEDGE) {
    await prisma.botKnowledge.upsert({
      where: { key: k.key },
      update: {
        category: k.category,
        name: k.name,
        keywords: k.keywords,
        body: k.body,
        always: k.always,
        isActive: true,
      },
      create: { ...k, isActive: true },
    });
  }

  // 2) Desactivar planes viejos (genericos + el "Solo pesas" anterior)
  await prisma.membershipPlan.updateMany({
    where: { name: { in: ["Mensual", "Trimestral", "Anual", "Solo pesas"] } },
    data: { isActive: false },
  });

  // 3) Planes reales (upsert por nombre; no hay unique en name)
  for (const p of PLANS) {
    const ex = await prisma.membershipPlan.findFirst({ where: { name: p.name } });
    if (ex) {
      await prisma.membershipPlan.update({
        where: { id: ex.id },
        data: { ...p, isActive: true },
      });
    } else {
      await prisma.membershipPlan.create({ data: { ...p, isActive: true } });
    }
  }

  // 4) Settings
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.gymSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // 5) Profesores placeholder (find-or-create por nombre).
  const instrId = {};
  for (const ins of INSTRUCTORS) {
    let ex = await prisma.instructor.findFirst({ where: { name: ins.name } });
    if (ex) {
      ex = await prisma.instructor.update({
        where: { id: ex.id },
        data: { specialty: ins.specialty, isActive: true },
      });
    } else {
      ex = await prisma.instructor.create({ data: ins });
    }
    instrId[ins.name] = ex.id;
  }
  // Reparte los 2 profesores del grupo entre las sesiones de esa clase.
  const counters = { indoor: 0, yoga: 0, barre: 0 };
  function pickInstructor(name) {
    const g = GROUP[name];
    if (!g) return null;
    const pool = POOL[g];
    const pick = pool[counters[g] % pool.length];
    counters[g]++;
    return instrId[pick] ?? null;
  }

  // 6) Horario semanal: desactiva todo, (re)activa el horario real y asigna un
  //    profesor placeholder SOLO si la sesion aun no tiene (no pisa lo que edite
  //    el staff). Idempotente por (name, dayOfWeek, startTime, room).
  await prisma.gymClass.updateMany({ data: { isActive: false } });
  for (const c of SCHEDULE) {
    const assigned = pickInstructor(c.name);
    const ex = await prisma.gymClass.findFirst({
      where: {
        name: c.name,
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        room: c.room,
      },
    });
    if (ex) {
      await prisma.gymClass.update({
        where: { id: ex.id },
        data: {
          isActive: true,
          ...(ex.instructorId ? {} : { instructorId: assigned }),
        },
      });
    } else {
      await prisma.gymClass.create({
        data: {
          ...c,
          capacity: 12,
          durationMin: 60,
          isActive: true,
          instructorId: assigned,
        },
      });
    }
  }

  const kc = await prisma.botKnowledge.count({ where: { isActive: true } });
  const cc = await prisma.gymClass.count({ where: { isActive: true } });
  const ic = await prisma.instructor.count();
  const plans = await prisma.membershipPlan.findMany({
    where: { isActive: true },
    select: { name: true, price: true },
    orderBy: { price: "asc" },
  });
  console.log(
    `OK. BotKnowledge activos: ${kc} | Clases activas: ${cc} | Profesores: ${ic}`,
  );
  console.log(
    "Planes activos:",
    plans.map((p) => `${p.name} $${p.price}`).join(" | "),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
