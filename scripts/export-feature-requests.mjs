// Exports feature requests to markdown so they can be analyzed with Claude Code.
// Run:  npm run requests:export > pending.md
// or:   node --env-file=.env --env-file=.env.local scripts/export-feature-requests.mjs
//
// By default it exports only requests pending analysis (NEW / IN_REVIEW without
// analyzedAt). With --all it exports every request, unfiltered.
//
// The exported document is in Spanish, like the requests themselves.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const all = process.argv.includes("--all");

const isoDate = (d) => d.toISOString().slice(0, 10);

async function main() {
  const requests = await prisma.featureRequest.findMany({
    where: all
      ? {}
      : { status: { in: ["NEW", "IN_REVIEW"] }, analyzedAt: null },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true, tier: true } } },
  });

  const lines = [
    `# Solicitudes de funcionalidad — Planify (${isoDate(new Date())})`,
    "",
    "Para cada solicitud: analiza su viabilidad contra el estado actual del codebase,",
    "estima el esfuerzo y da un veredicto: VIABLE / NOT_VIABLE / NEEDS_DESIGN.",
    "",
  ];

  requests.forEach((r, i) => {
    lines.push(
      `## ${i + 1}. ${r.title}`,
      "",
      `- id: ${r.id}  |  status: ${r.status}  |  fecha: ${isoDate(r.createdAt)}`,
      `- cuenta: ${r.user.name ?? "Sin nombre"} <${r.user.email}> (tier ${r.user.tier})`,
      "",
      r.description,
      "",
    );
  });

  if (requests.length === 0) {
    lines.push("_No hay solicitudes pendientes de análisis._", "");
  }

  process.stdout.write(lines.join("\n"));
}

main()
  .catch((e) => {
    console.error("❌ Failed to export feature requests:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
