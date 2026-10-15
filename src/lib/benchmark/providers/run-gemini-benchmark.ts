import { GoogleGenAI } from "@google/genai";
import {
  buildBenchmarkSystemInstruction,
  buildBenchmarkUserPayload,
} from "@/lib/benchmark/benchmark-prompt";
import {
  BENCHMARK_GEMINI_FALLBACK,
  classifyGeminiBenchmarkError,
  geminiModelSupportsThinkingBudget,
  resolveBenchmarkGeminiPrimary,
} from "@/lib/benchmark/gemini-benchmark-config";
import { scoreBenchmarkResponse } from "@/lib/benchmark/score-benchmark-result";
import { DECISION_BRIEF_JSON_SCHEMA } from "@/lib/decision-brief-schema";
import { GEMINI_MAX_OUTPUT_TOKENS } from "@/lib/gemini-config";
import type { LeadIntakeFormData } from "@/types/lead";
import type { BenchmarkAttemptResult } from "@/lib/benchmark/score-benchmark-result";

function buildGeminiConfig(model: string, signal: AbortSignal) {
  const config: {
    systemInstruction: string;
    abortSignal: AbortSignal;
    temperature: number;
    maxOutputTokens: number;
    responseMimeType: "application/json";
    responseJsonSchema: typeof DECISION_BRIEF_JSON_SCHEMA;
    thinkingConfig?: { thinkingBudget: number };
  } = {
    systemInstruction: buildBenchmarkSystemInstruction(),
    abortSignal: signal,
    temperature: 0.15,
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    responseMimeType: "application/json",
    responseJsonSchema: DECISION_BRIEF_JSON_SCHEMA,
  };
  if (geminiModelSupportsThinkingBudget(model)) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}

async function generateOnce(
  ai: GoogleGenAI,
  model: string,
  lead: LeadIntakeFormData,
  signal: AbortSignal,
) {
  return ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: buildBenchmarkUserPayload(lead) }],
      },
    ],
    config: buildGeminiConfig(model, signal),
  });
}

function httpStatus(error: unknown): number | undefined {
  return (error as { status?: number }).status;
}

function shouldTryFallbackModel(error: unknown): boolean {
  const status = httpStatus(error);
  return status === 404 || status === 503 || status === 429;
}

function isRetryableOnSameModel(error: unknown): boolean {
  const status = httpStatus(error);
  return status === 503 || status === 429;
}

export async function runGeminiBenchmarkAttempt(
  lead: LeadIntakeFormData,
  apiKey: string,
  attempt: number,
  timeoutMs: number,
): Promise<BenchmarkAttemptResult> {
  const started = performance.now();
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const primary = resolveBenchmarkGeminiPrimary();
  const modelsToTry = [
    primary,
    ...(primary !== BENCHMARK_GEMINI_FALLBACK ? [BENCHMARK_GEMINI_FALLBACK] : []),
  ];

  let lastError: unknown;
  let modelUsed = primary;

  try {
    for (const model of modelsToTry) {
      modelUsed = model;
      let retries = model === primary ? 2 : 0;
      while (true) {
        try {
          const response = await generateOnce(ai, model, lead, controller.signal);
          const text = response.text?.trim();
          return scoreBenchmarkResponse(
            "gemini",
            model,
            attempt,
            Math.round(performance.now() - started),
            text,
          );
        } catch (error) {
          lastError = error;
          if (retries > 0 && isRetryableOnSameModel(error)) {
            retries -= 1;
            await new Promise((r) => setTimeout(r, 2500));
            continue;
          }
          if (model !== modelsToTry.at(-1) && shouldTryFallbackModel(error)) {
            break;
          }
          throw error;
        }
      }
    }
    throw lastError;
  } catch (error) {
    return {
      provider: "gemini",
      model: modelUsed,
      attempt,
      latencyMs: Math.round(performance.now() - started),
      ok: false,
      jsonParsed: false,
      schemaValid: false,
      sourcesEnforced: false,
      errorCategory: classifyGeminiBenchmarkError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
