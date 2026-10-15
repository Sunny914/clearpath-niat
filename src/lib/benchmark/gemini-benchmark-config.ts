/**
 * Benchmark-only Gemini models (production /api/brief unchanged).
 * New API keys cannot use 2.5 Flash per Google docs — use 3.8 Flash or 3.5 Flash-Lite.
 */
export const BENCHMARK_GEMINI_FALLBACK = "gemini-3.5-flash-lite";

export function resolveBenchmarkGeminiPrimary(): string {
  return process.env.BENCHMARK_GEMINI_MODEL?.trim() || "gemini-3.8-flash";
}

export { geminiModelSupportsThinkingBudget } from "@/lib/gemini-config";

export function classifyGeminiBenchmarkError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  const status = (error as { status?: number }).status;
  if (typeof status === "number") return `http_${status}`;
  return "provider_error";
}
