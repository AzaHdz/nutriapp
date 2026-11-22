import type {
  BacklogItem,
  BacklogPriority,
  BacklogStatus,
  BacklogType,
  BugSeverity,
} from "@prisma/client";
import type { Tone } from "@/components/ui/Badge";

// Internal admin backlog (/admin/backlog). Order = lifecycle / importance,
// used for tabs, selects and filters.

export const BACKLOG_STATUSES: BacklogStatus[] = ["INBOX", "TODO", "IN_PROGRESS", "DONE", "WONT_FIX"];
export const BACKLOG_TYPES: BacklogType[] = ["BUG", "IMPROVEMENT", "TECH_DEBT"];
export const BACKLOG_PRIORITIES: BacklogPriority[] = ["P1", "P2", "P3", "P4"];
export const BUG_SEVERITIES: BugSeverity[] = ["BLOCKER", "MAJOR", "MINOR", "COSMETIC"];

/** Open statuses: the only ones a feature request can be linked to. */
export const OPEN_BACKLOG_STATUSES: BacklogStatus[] = ["INBOX", "TODO", "IN_PROGRESS"];

/** Statuses that close an item: moving into one stamps resolvedAt. */
export const RESOLVED_STATUSES: BacklogStatus[] = ["DONE", "WONT_FIX"];

export const BACKLOG_STATUS_LABELS: Record<BacklogStatus, string> = {
  INBOX: "Bandeja",
  TODO: "Por hacer",
  IN_PROGRESS: "En curso",
  DONE: "Hecho",
  WONT_FIX: "Descartado",
};

export const BACKLOG_STATUS_TONES: Record<BacklogStatus, Tone> = {
  INBOX: "info",
  TODO: "neutral",
  IN_PROGRESS: "warning",
  DONE: "success",
  WONT_FIX: "danger",
};

export const BACKLOG_TYPE_LABELS: Record<BacklogType, string> = {
  BUG: "Bug",
  IMPROVEMENT: "Mejora",
  TECH_DEBT: "Deuda técnica",
};

export const BACKLOG_TYPE_TONES: Record<BacklogType, Tone> = {
  BUG: "danger",
  IMPROVEMENT: "primary",
  TECH_DEBT: "neutral",
};

export const BACKLOG_PRIORITY_LABELS: Record<BacklogPriority, string> = {
  P1: "P1 · Urgente",
  P2: "P2 · Alta",
  P3: "P3 · Normal",
  P4: "P4 · Baja",
};

export const BACKLOG_PRIORITY_TONES: Record<BacklogPriority, Tone> = {
  P1: "danger",
  P2: "warning",
  P3: "neutral",
  P4: "neutral",
};

export const BUG_SEVERITY_LABELS: Record<BugSeverity, string> = {
  BLOCKER: "Bloqueante",
  MAJOR: "Mayor",
  MINOR: "Menor",
  COSMETIC: "Cosmético",
};

/**
 * Backlog order: BLOCKER bugs first, then priority (P1 → P4), then oldest first.
 * Done in JS because "blocker first" can't be expressed as a Prisma orderBy.
 */
export function compareBacklogItems(
  a: Pick<BacklogItem, "type" | "severity" | "priority" | "createdAt">,
  b: Pick<BacklogItem, "type" | "severity" | "priority" | "createdAt">,
) {
  const blocker = (i: typeof a) => (i.type === "BUG" && i.severity === "BLOCKER" ? 0 : 1);
  return (
    blocker(a) - blocker(b) ||
    BACKLOG_PRIORITIES.indexOf(a.priority) - BACKLOG_PRIORITIES.indexOf(b.priority) ||
    a.createdAt.getTime() - b.createdAt.getTime()
  );
}

// ── "Copiar para Claude" (phase 4) ──────────────────────────────────────
// Pure text builders: no I/O, no dates, no env, so they can be unit-tested later.
// The output is pasted OUTSIDE the app (a Claude Code session with no database
// access), so it must never carry nutritionists' names or emails.

/**
 * Start of the attribution line that createBacklogItemFromRequest appends to the
 * description ("Solicitado por <name or email> el <date>"). The task text drops
 * that line because it contains personal data.
 */
export const REQUESTED_BY_PREFIX = "Solicitado por ";

const TASK_TYPE_HEADINGS: Record<BacklogType, string> = {
  BUG: "Bug",
  IMPROVEMENT: "Mejora",
  TECH_DEBT: "Deuda técnica",
};

export type BacklogTaskItem = Pick<
  BacklogItem,
  | "id"
  | "type"
  | "title"
  | "description"
  | "priority"
  | "severity"
  | "area"
  | "status"
  | "stepsToRepro"
  | "pageUrl"
  | "viewport"
  | "userAgent"
> & {
  /** Linked feature requests. userId is only used to count people; it isn't printed. */
  featureRequests?: { title: string; userId: string }[];
};

/** Trims, drops the "Solicitado por …" attribution lines and collapses blank runs. */
function cleanText(text: string | null | undefined): string {
  return (text ?? "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(REQUESTED_BY_PREFIX))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Markdown section; returns null when there's no content so it's left out. */
function section(title: string, body: string | null): string | null {
  return body ? `## ${title}\n${body}` : null;
}

function bulletList(entries: [label: string, value: string | null | undefined][]): string | null {
  const lines = entries.filter(([, v]) => v).map(([label, v]) => `- ${label}: ${v}`);
  return lines.length ? lines.join("\n") : null;
}

/**
 * Turns a backlog item into a Spanish markdown task ready to paste into Claude Code.
 * Empty sections are omitted.
 */
export function backlogItemToClaudeTask(item: BacklogTaskItem): string {
  const isBug = item.type === "BUG";

  const data = bulletList([
    ["ID", `\`${item.id}\``],
    ["Prioridad", BACKLOG_PRIORITY_LABELS[item.priority]],
    ["Severidad", isBug && item.severity ? BUG_SEVERITY_LABELS[item.severity] : null],
    ["Área", item.area?.trim()],
    ["Estado", BACKLOG_STATUS_LABELS[item.status]],
  ]);

  const context = bulletList([
    ["Página", item.pageUrl ? `\`${item.pageUrl}\`` : null],
    ["Tamaño de pantalla", item.viewport],
    ["Navegador", item.userAgent ? `\`${item.userAgent}\`` : null],
  ]);

  const requests = item.featureRequests ?? [];
  let requestsBody: string | null = null;
  if (requests.length > 0) {
    const people = new Set(requests.map((r) => r.userId)).size;
    const who = people === 1 ? "1 nutriólogo" : `${people} nutriólogos`;
    const count =
      requests.length === people
        ? ""
        : ` (${requests.length} ${requests.length === 1 ? "solicitud" : "solicitudes"})`;
    requestsBody = [
      `Lo pidieron ${who}${count}:`,
      ...requests.map((r) => `- ${r.title.trim()}`),
    ].join("\n");
  }

  const instructions = [
    "- Lee AGENTS.md primero.",
    ...(isBug ? ["- Antes de cambiar código, localiza la causa y explícala en el PR."] : []),
    `- Trabaja en una rama nueva y abre un PR a main. En la descripción del PR incluye 'Backlog item: ${item.id}'.`,
    "- Corre npm run lint y npx tsc --noEmit antes de abrir el PR.",
    "- No te quedes pendiente del PR después de abrirlo.",
  ].join("\n");

  return [
    `# ${TASK_TYPE_HEADINGS[item.type]}: ${item.title.trim()}`,
    section("Datos", data),
    section("Descripción", cleanText(item.description)),
    section("Pasos para reproducir", cleanText(item.stepsToRepro)),
    section("Contexto capturado", context),
    section("Solicitudes de nutriólogos", requestsBody),
    section("Instrucciones", instructions),
  ]
    .filter((part): part is string => part !== null)
    .join("\n\n");
}

export type BacklogListItem = Pick<BacklogItem, "id" | "type" | "title" | "priority" | "severity" | "status">;

/**
 * One-line-per-item summary of the OPEN items, for asking Claude to prioritize.
 * Expects the items already in backlog order (compareBacklogItems); returns null
 * when none of them is open.
 */
export function backlogItemsToPriorityList(items: BacklogListItem[]): string | null {
  const open = items.filter((i) => OPEN_BACKLOG_STATUSES.includes(i.status));
  if (open.length === 0) return null;

  const lines = open.map((i) => {
    const type =
      i.type === "BUG" && i.severity === "BLOCKER" ? "Bug bloqueante" : TASK_TYPE_HEADINGS[i.type];
    return `- ${i.priority} · ${type} · ${i.title.trim()} (ID: \`${i.id}\`)`;
  });

  return [
    "Ayúdame a priorizar estos pendientes y propón por cuál empezar.",
    "",
    `Pendientes del backlog de NutriApp (${open.length}), en el orden actual del backlog:`,
    "",
    ...lines,
  ].join("\n");
}
