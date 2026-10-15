/**
 * Model IDs — see Google AI docs (generateContent structured output, model pages):
 * - gemini-3.5-flash-lite: stable Flash-Lite for new projects; structured outputs supported.
 * - gemini-3.8-flash: stable Flash for new projects; structured outputs supported (404-only fallback).
 * Legacy 2.5 Flash models are restricted for keys that have not used them before.
 * Override anytime with GEMINI_MODEL (single model, no automatic fallback).
 */

/** Default primary: benchmark-verified on current API keys (structured JSON + approved URLs). */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

/** 404-only fallback when primary model ID is unavailable — not used for 503, 429, or slow responses. */
export const GEMINI_MODEL_NOT_FOUND_FALLBACK = "gemini-3.8-flash";

export const DEFAULT_GEMINI_TIMEOUT_MS = 90_000;

/** Cap output size to reduce latency; schema fits comfortably below this. */
export const GEMINI_MAX_OUTPUT_TOKENS = 2048;

/** Flash-Lite models reject thinkingConfig; only attach for models that support it. */
export function geminiModelSupportsThinkingBudget(model: string): boolean {
  const id = model.toLowerCase();
  if (id.includes("flash-lite")) return false;
  return id.includes("2.5") || id.includes("3.8") || id.includes("3.6");
}

export function resolveGeminiTimeoutMs(): number {
  const configured = Number(process.env.GEMINI_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured >= 30_000) {
    return configured;
  }
  return DEFAULT_GEMINI_TIMEOUT_MS;
}

/** Fixed model list for the request — set once via env or defaults; no mid-request switching except 404 fallback. */
export function resolveModelsToTry(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (configured) return [configured];
  return [DEFAULT_GEMINI_MODEL, GEMINI_MODEL_NOT_FOUND_FALLBACK];
}

/** Retry with alternate model only when the model name is invalid/unavailable — never for 503/slow responses. */
export function shouldFallbackForModelNotFound(error: unknown): boolean {
  const status = (error as { status?: number }).status;
  if (status === 404) return true;

  if (!(error instanceof Error)) return false;
  const message = error.message;
  return (
    message.includes('"code":404') ||
    message.includes("no longer available") ||
    message.includes("not found") ||
    message.includes("NOT_FOUND")
  );
}

export function shouldAttemptFallbackModel(
  error: unknown,
  configuredModel: string | undefined,
  currentModel: string,
  modelsToTry: readonly string[],
): boolean {
  if (configuredModel) return false;
  if (!shouldFallbackForModelNotFound(error)) return false;
  const index = modelsToTry.indexOf(currentModel);
  return index >= 0 && index < modelsToTry.length - 1;
}
