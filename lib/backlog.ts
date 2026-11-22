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
