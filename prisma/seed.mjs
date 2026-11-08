// Demo data seed for NutriApp.
// Run:  npm run db:seed        (loads .env / .env.local automatically)
// or:   node --env-file=.env --env-file=.env.local prisma/seed.mjs
//
// Creates (or reuses) a demo nutritionist account and fills it with patients,
// consultations and plans in various states. It is idempotent: it deletes and
// recreates THAT demo account's data on every run (other accounts are untouched).
//
// The demo content is in Spanish because the UI is.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = (process.env.SEED_EMAIL ?? "demo@nutriapp.test").toLowerCase();
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "nutriapp123";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY_MS);

/** Builds a valid, arithmetically consistent MealPlan for `kcal`. */
function buildPlan(kcal) {
  const baseMeals = [
    { name: "Desayuno", time: "07:30–08:30", share: 0.25, options: [
      { d: "Huevos revueltos con espinaca y tortillas de maíz", f: ["2 huevos", "1 taza de espinaca", "2 tortillas de maíz", "1/2 taza de papaya"] },
      { d: "Avena con plátano y crema de cacahuate", f: ["1/2 taza de avena", "1 plátano", "1 cda de crema de cacahuate", "1 taza de leche"] },
      { d: "Molletes de frijol con pico de gallo", f: ["1 bolillo integral", "1/2 taza de frijoles", "pico de gallo al gusto"] },
    ] },
    { name: "Colación matutina", time: "11:00", share: 0.1, options: [
      { d: "Jícama con limón y chile", f: ["1 taza de jícama", "limón y chile al gusto", "puño de garbanzo tostado"] },
      { d: "Manzana con crema de cacahuate", f: ["1 manzana", "1 cda de crema de cacahuate"] },
    ] },
    { name: "Comida", time: "14:30", share: 0.35, options: [
      { d: "Pollo a la plancha con arroz integral y nopales", f: ["120 g de pollo", "3/4 taza de arroz integral", "1/2 taza de frijoles", "nopales al gusto"] },
      { d: "Tacos de pescado en tortilla de maíz", f: ["3 tacos", "130 g de pescado blanco", "1/4 de aguacate", "pico de gallo"] },
      { d: "Bowl de lenteja con verduras asadas", f: ["1 taza de lenteja", "verduras asadas al gusto", "1/2 taza de arroz"] },
    ] },
    { name: "Colación vespertina", time: "17:30", share: 0.1, options: [
      { d: "Yogur natural con fruta", f: ["3/4 taza de yogur natural", "1/2 taza de fresas"] },
      { d: "Puño de almendras", f: ["20 g de almendras"] },
    ] },
    { name: "Cena", time: "20:30", share: 0.2, options: [
      { d: "Tostadas horneadas de tinga de pollo", f: ["2 tostadas horneadas", "80 g de pollo deshebrado", "lechuga y salsa verde"] },
      { d: "Crema de calabaza con pan integral", f: ["1 taza de crema de calabaza", "1 rebanada de pan integral", "1 huevo cocido"] },
    ] },
  ];

  const meals = baseMeals.map((m) => {
    const target = Math.round(kcal * m.share);
    return {
      name: m.name,
      suggestedTime: m.time,
      options: m.options.map((o, i) => ({
        description: o.d,
        foods: o.f,
        // kcal close to the meal's target (±5%) so the options are interchangeable
        approxKcal: Math.round(target * (1 + (i - 1) * 0.05)),
      })),
    };
  });

  return {
    dailyKcalTarget: kcal,
    macros: {
      protein_g: Math.round((kcal * 0.3) / 4),
      carbs_g: Math.round((kcal * 0.4) / 4),
      fat_g: Math.round((kcal * 0.3) / 9),
    },
    meals,
    generalRecommendations: [
      "Toma al menos 2 litros de agua al día.",
      "Realiza 30 minutos de actividad física la mayoría de los días.",
      "Prioriza verduras en comida y cena.",
    ],
    supplements: [],
    warnings: [],
  };
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: "Dra. Sofía Ramírez", licenseNumber: "12345678", passwordHash },
    create: { email: DEMO_EMAIL, name: "Dra. Sofía Ramírez", licenseNumber: "12345678", passwordHash },
  });

  // Clears ONLY the demo account's data (the cascade deletes consultations and appointments)
  await prisma.patient.deleteMany({ where: { userId: user.id } });
  await prisma.featureRequest.deleteMany({ where: { userId: user.id } });

  // patient: { name, gender, age, email, phone?, notes?, goal, restrictions, consultations }
  // consultation: { d: daysAgo, weight, height, waist?, hip?, arm?, bodyFat?, plan?: kcal, approved?: bool }
  //
  // Only María Fernanda has hip and arm: hers is the long series used to exercise
  // all six metrics of the progress chart. Everyone else leaves them null on
  // purpose, so the per-metric empty state can be seen.
  //
  // Phones come in different formats on purpose (with and without area code, with
  // +52, with dashes) to exercise the E.164 normalization of the WhatsApp reminder.
  // Ana Lucía has no phone so the disabled button can be seen.
  const patients = [
    {
      name: "María Fernanda López", gender: "FEMALE", age: 34, email: "maria.lopez@example.com", phone: "55 0000 0001",
      notes: "Prefiere consultas por la tarde. La alergia a la nuez está confirmada por su alergólogo.",
      goal: "Pérdida de grasa gradual", restrictions: "alergia a nuez, intolerancia a lactosa, no come res",
      consultations: [
        { d: 155, weight: 78.1, height: 165, waist: 92, hip: 108, arm: 32, bodyFat: 34 },
        { d: 120, weight: 76.0, height: 165, waist: 89, hip: 105.5, arm: 31, bodyFat: 33, plan: 1800, approved: true },
        { d: 70, weight: 74.5, height: 165, waist: 86, hip: 103, arm: 30.5, bodyFat: 32, plan: 1800, approved: true },
        { d: 16, weight: 72.4, height: 165, waist: 84, hip: 101, arm: 29.5, bodyFat: 31.2, plan: 1840, approved: false },
      ],
    },
    {
      name: "Carlos Mendoza Ruiz", gender: "MALE", age: 41, email: "cmendoza@example.com", phone: "+52 55 0000 0002",
      goal: "Valoración inicial", restrictions: "Sin restricciones declaradas",
      consultations: [{ d: 1, weight: 92.3, height: 178, waist: 104, bodyFat: 28 }],
    },
    {
      name: "Ana Lucía Vargas", gender: "FEMALE", age: 29, email: "analu.vargas@example.com",
      goal: "Control de peso", restrictions: "vegetariana",
      consultations: [
        { d: 60, weight: 63.0, height: 168, waist: 76, bodyFat: 26 },
        { d: 20, weight: 61.5, height: 168, waist: 74, bodyFat: 25, plan: 1600, approved: false },
      ],
    },
    {
      name: "Jorge Torres Peña", gender: "MALE", age: 55, email: "jtorres.pena@example.com", phone: "5500000003",
      goal: "Manejo de diabetes tipo 2", restrictions: "diabetes tipo 2, hipertensión",
      consultations: [
        { d: 90, weight: 98.0, height: 176, waist: 112, bodyFat: 32 },
        { d: 25, weight: 95.2, height: 176, waist: 108, bodyFat: 31, plan: 1650, approved: false },
      ],
    },
    {
      name: "Valentina Gómez", gender: "FEMALE", age: 26, email: "vale.gomez@example.com", phone: "(55) 0000-0004",
      goal: "Rendimiento deportivo", restrictions: "no come cerdo",
      consultations: [
        { d: 45, weight: 58.0, height: 163, waist: 68, bodyFat: 22 },
        { d: 12, weight: 58.6, height: 163, waist: 68, bodyFat: 21.5, plan: 2100, approved: true },
      ],
    },
    {
      name: "Ricardo Díaz Osorio", gender: "MALE", age: 38, email: "ricardo.diaz@example.com", phone: "52 1 55 0000 0005",
      goal: "Aumento de masa muscular", restrictions: "Sin restricciones declaradas",
      consultations: [
        { d: 66, weight: 74.0, height: 175, waist: 82 },
        { d: 30, weight: 76.5, height: 175, waist: 83, plan: 2600, approved: true },
      ],
    },
    {
      // Just added: no consultations yet, but an appointment is booked. Covers three
      // states no other patient produces: a record without consultations, a patient
      // without email, and a phone that can't be normalized to E.164 (the field is
      // free text and people really type things like this).
      name: "Sofía Herrera Luna", gender: "FEMALE", age: 31, email: null,
      phone: "pendiente, preguntar en recepción",
      notes: "Referida por Valentina Gómez. Pidió cita de valoración; aún sin consulta.",
      goal: "Valoración inicial", restrictions: "Sin restricciones declaradas",
      consultations: [],
    },
  ];

  let totalConsultations = 0;
  const idByName = new Map();
  for (const p of patients) {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - p.age);

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        name: p.name,
        birthDate,
        gender: p.gender,
        email: p.email ?? null,
        phone: p.phone ?? null,
        notes: p.notes ?? null,
        consentAt: daysAgo(200),
        createdAt: daysAgo(200),
      },
    });
    idByName.set(p.name, patient.id);

    for (const c of p.consultations) {
      const plan = c.plan ? buildPlan(c.plan) : null;
      await prisma.consultation.create({
        data: {
          userId: user.id,
          patientId: patient.id,
          weight: c.weight,
          height: c.height,
          waist: c.waist ?? null,
          hip: c.hip ?? null,
          arm: c.arm ?? null,
          bodyFatPct: c.bodyFat ?? null,
          goals: p.goal,
          restrictions: p.restrictions,
          generatedPlan: plan ?? undefined,
          finalPlan: plan ?? undefined,
          promptVersion: plan ? "plan-v3" : null,
          aiModel: plan ? "seed-demo" : null,
          inputTokens: plan ? 1200 : null,
          outputTokens: plan ? 2400 : null,
          generationCount: plan ? 1 : 0,
          approvedAt: c.approved ? daysAgo(c.d) : null,
          createdAt: daysAgo(c.d),
        },
      });
      totalConsultations++;
    }
  }

  // ── Appointments ─────────────────────────────────────────────────────────
  // This script is .mjs and can't import lib/dates.ts, so it replicates its UTC
  // conversion. If that one changes, change this too.
  const TIME_ZONE = "America/Mexico_City";

  function offsetMin(instant) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
        .formatToParts(instant)
        .map((x) => [x.type, x.value])
    );
    const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return (asIfUtc - instant.getTime()) / 60000;
  }

  /** Day relative to today (in Mexico) + local time → the UTC instant to store. */
  function appointmentAt(daysFromToday, hhmm) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const [y, m, d] = today.split("-").map(Number);
    const [h, min] = hhmm.split(":").map(Number);
    const tentative = Date.UTC(y, m - 1, d + daysFromToday, h, min);
    return new Date(tentative - offsetMin(new Date(tentative)) * 60000);
  }

  // d = days from today (negative = past). Valentina's 21:00 one is the one that
  // exposes a time zone bug: on a UTC server it would land on the next day.
  const appointments = [
    { patient: "María Fernanda López", d: 0, time: "10:00", dur: 60, status: "CONFIRMED", notes: "Revisión de plan y ajuste de macros" },
    { patient: "Jorge Torres Peña", d: 0, time: "13:30", dur: 45, status: "SCHEDULED" },
    { patient: "Ana Lucía Vargas", d: 1, time: "09:00", dur: 60, status: "SCHEDULED", notes: "Primera revisión del plan vegetariano" },
    { patient: "Valentina Gómez", d: 2, time: "21:00", dur: 45, status: "SCHEDULED", notes: "Cita nocturna: entrena por la tarde" },
    { patient: "Ricardo Díaz Osorio", d: 4, time: "11:00", dur: 60, status: "SCHEDULED" },
    // A full day: with 4 appointments the cell shows only 3 plus the "+1 más" chip
    { patient: "Sofía Herrera Luna", d: 3, time: "09:00", dur: 60, status: "SCHEDULED", notes: "Valoración inicial" },
    { patient: "María Fernanda López", d: 3, time: "10:30", dur: 45, status: "CONFIRMED" },
    { patient: "Jorge Torres Peña", d: 3, time: "12:00", dur: 45, status: "SCHEDULED" },
    { patient: "Ana Lucía Vargas", d: 3, time: "16:30", dur: 60, status: "SCHEDULED" },
    { patient: "Carlos Mendoza Ruiz", d: 9, time: "16:00", dur: 90, status: "SCHEDULED", notes: "Valoración completa, viene acompañado" },
    { patient: "María Fernanda López", d: -7, time: "10:00", dur: 60, status: "COMPLETED" },
    { patient: "Ricardo Díaz Osorio", d: -3, time: "12:00", dur: 60, status: "CANCELLED", notes: "Avisó que salía de viaje" },
  ];

  for (const a of appointments) {
    await prisma.appointment.create({
      data: {
        userId: user.id,
        patientId: idByName.get(a.patient),
        startsAt: appointmentAt(a.d, a.time),
        durationMin: a.dur,
        status: a.status,
        notes: a.notes ?? null,
      },
    });
  }

  // Feature requests in different states
  const featureRequests = [
    {
      title: "Recordatorios de consulta por WhatsApp",
      description:
        "Me encantaría que el sistema mandara un recordatorio automático por WhatsApp a mis pacientes un día antes de su consulta. Muchos se me olvidan de venir.",
      status: "NEW",
      d: 2,
    },
    {
      title: "Exportar expediente completo a PDF",
      description:
        "Además del plan alimenticio, quisiera exportar todo el historial del paciente (mediciones y evolución) en un solo PDF para compartirlo con otros especialistas.",
      status: "IN_REVIEW",
      d: 9,
    },
    {
      title: "Gráfica de evolución de peso",
      description:
        "Ver una gráfica con la evolución del peso y la grasa corporal del paciente a lo largo de sus consultas, para mostrársela en pantalla durante la cita.",
      status: "APPROVED",
      response:
        "¡Gran idea! La aprobamos y la tenemos en la lista para una próxima versión. Te avisamos cuando esté disponible.",
      d: 20,
    },
  ];

  for (const r of featureRequests) {
    await prisma.featureRequest.create({
      data: {
        userId: user.id,
        title: r.title,
        description: r.description,
        status: r.status,
        adminResponse: r.response ?? null,
        respondedAt: r.response ? daysAgo(r.d - 1) : null,
        createdAt: daysAgo(r.d),
      },
    });
  }

  console.log("\n✅ Seed complete");
  console.log(`   Demo user: ${DEMO_EMAIL}  ·  password: ${DEMO_PASSWORD}`);
  console.log(`   ${patients.length} patients · ${totalConsultations} consultations · ${appointments.length} appointments · ${featureRequests.length} feature requests`);
  console.log("   Sign in with that account to see the data.\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
