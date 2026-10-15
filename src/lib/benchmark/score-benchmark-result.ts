import {
  enforceApprovedSources,
  normalizeDecisionBrief,
  parseDecisionBriefFromJson,
} from "@/lib/parse-decision-brief";

export type BenchmarkAttemptResult = {
  provider: string;
  model: string;
  attempt: number;
  latencyMs: number;
  ok: boolean;
  jsonParsed: boolean;
  schemaValid: boolean;
  sourcesEnforced: boolean;
  errorCategory?: string;
};

export function scoreBenchmarkResponse(
  provider: string,
  model: string,
  attempt: number,
  latencyMs: number,
  rawText: string | undefined,
): BenchmarkAttemptResult {
  const base = {
    provider,
    model,
    attempt,
    latencyMs,
    ok: false,
    jsonParsed: false,
    schemaValid: false,
    sourcesEnforced: false,
  };

  if (!rawText?.trim()) {
    return { ...base, errorCategory: "empty_response" };
  }

  const parsed = parseDecisionBriefFromJson(rawText);
  if (!parsed) {
    return { ...base, errorCategory: "invalid_json_or_schema" };
  }

  const enforced = enforceApprovedSources(parsed);
  const stillValid = normalizeDecisionBrief(enforced);

  return {
    ...base,
    ok: stillValid !== null,
    jsonParsed: true,
    schemaValid: true,
    sourcesEnforced: stillValid !== null,
    errorCategory: stillValid ? undefined : "enforce_sources_failed",
  };
}

export function summarizeAttempts(results: BenchmarkAttemptResult[]) {
  const total = results.length;
  const successes = results.filter((r) => r.ok).length;
  const latencies = results.filter((r) => r.ok).map((r) => r.latencyMs);
  const avgMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null;
  const medianMs =
    latencies.length > 0
      ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
      : null;

  return {
    attempts: total,
    successRate: total > 0 ? successes / total : 0,
    avgLatencyMs: avgMs,
    medianLatencyMs: medianMs,
    errors: results
      .filter((r) => !r.ok)
      .map((r) => r.errorCategory ?? "unknown"),
  };
}
