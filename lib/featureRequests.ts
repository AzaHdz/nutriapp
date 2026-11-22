import type { FeatureRequestStatus } from "@prisma/client";
import type { Tone } from "@/components/ui/Badge";

// Statuses in lifecycle order (used for selects and filters)
export const FEATURE_REQUEST_STATUSES: FeatureRequestStatus[] = [
  "NEW",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "IMPLEMENTED",
];

// Statuses that count as "pending review" for the anti-spam cap
export const OPEN_STATUSES: FeatureRequestStatus[] = ["NEW", "IN_REVIEW"];
export const MAX_OPEN_REQUESTS = 10;

// Linked requests in these statuses become IMPLEMENTED when their backlog item
// is marked DONE. REJECTED is left alone (the admin already said no).
export const IMPLEMENTED_ON_DONE_STATUSES: FeatureRequestStatus[] = ["NEW", "IN_REVIEW", "APPROVED"];

export const STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  NEW: "Nueva",
  IN_REVIEW: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  IMPLEMENTED: "Implementada",
};

export const STATUS_TONES: Record<FeatureRequestStatus, Tone> = {
  NEW: "info",
  IN_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  IMPLEMENTED: "primary",
};

// Verdicts from the AI feasibility analysis.
// Keep in sync with scripts/analyze-feature-requests.mjs (it can't import TS).
export const AI_VERDICTS = ["VIABLE", "NOT_VIABLE", "NEEDS_DESIGN"] as const;
export type AiVerdict = (typeof AI_VERDICTS)[number];

export const VERDICT_LABELS: Record<AiVerdict, string> = {
  VIABLE: "Viable",
  NOT_VIABLE: "No viable",
  NEEDS_DESIGN: "Requiere diseño",
};

export const VERDICT_TONES: Record<AiVerdict, Tone> = {
  VIABLE: "success",
  NOT_VIABLE: "danger",
  NEEDS_DESIGN: "warning",
};
