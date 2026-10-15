import type { BriefGenerationErrorCode } from "@/lib/generate-gemini-brief";

export type BriefFailureCategory =
  | BriefGenerationErrorCode
  | "validation"
  | "invalid_json_body"
  | "unexpected";

export function logBriefRequestStart(requestId: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info(`[api/brief] start requestId=${requestId}`);
}

export function logBriefFailure(
  requestId: string,
  category: BriefFailureCategory,
  detail?: string,
): void {
  if (process.env.NODE_ENV !== "development") return;
  const safeDetail = detail ? ` detail=${detail.slice(0, 200)}` : "";
  console.error(
    `[api/brief] failed requestId=${requestId} category=${category}${safeDetail}`,
  );
}

export function logBriefSuccess(
  requestId: string,
  source: string,
  durationMs: number,
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info(
    `[api/brief] ok requestId=${requestId} source=${source} durationMs=${Math.round(durationMs)}`,
  );
}

export function logBriefTimings(
  requestId: string,
  line: string,
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info(line);
}
