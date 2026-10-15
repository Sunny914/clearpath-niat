export type BriefTimingPhase =
  | "parse_json"
  | "validate_lead"
  | "sanitize_lead"
  | "gemini_request"
  | "parse_result"
  | "enforce_sources"
  | "total_api";

export class BriefTimingCollector {
  private readonly starts = new Map<string, number>();
  readonly phasesMs: Partial<Record<BriefTimingPhase | string, number>> = {};
  readonly meta: Record<string, string> = {};

  setMeta(key: string, value: string): void {
    this.meta[key] = value;
  }

  markStart(phase: BriefTimingPhase | string): void {
    this.starts.set(phase, performance.now());
  }

  markEnd(phase: BriefTimingPhase | string): void {
    const start = this.starts.get(phase);
    if (start === undefined) return;
    this.phasesMs[phase] = Math.round(performance.now() - start);
    this.starts.delete(phase);
  }

  setPhase(phase: BriefTimingPhase | string, ms: number): void {
    this.phasesMs[phase] = Math.round(ms);
  }
}

export function formatTimingLog(
  requestId: string,
  phasesMs: Partial<Record<string, number>>,
  meta?: Record<string, string>,
): string {
  const parts = Object.entries(phasesMs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}ms`)
    .join(" ");
  const metaStr = meta
    ? ` ${Object.entries(meta)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")}`
    : "";
  return `[api/brief] timing requestId=${requestId}${metaStr} ${parts}`;
}
