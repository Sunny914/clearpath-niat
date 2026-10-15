import {
  buildBenchmarkSystemInstruction,
  buildBenchmarkUserPayload,
} from "@/lib/benchmark/benchmark-prompt";
import { buildOpenAiJsonSchemaFormat } from "@/lib/benchmark/openai-schema-format";
import {
  scoreBenchmarkResponse,
  type BenchmarkAttemptResult,
} from "@/lib/benchmark/score-benchmark-result";
import type { LeadIntakeFormData } from "@/types/lead";

type OpenAiCompatibleConfig = {
  provider: "groq" | "openrouter";
  url: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  schemaStrict: boolean;
};

export async function runOpenAiCompatibleBenchmarkAttempt(
  lead: LeadIntakeFormData,
  config: OpenAiCompatibleConfig,
  attempt: number,
  timeoutMs: number,
): Promise<BenchmarkAttemptResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey.trim()}`,
        ...config.extraHeaders,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.15,
        max_tokens: 2048,
        messages: [
          { role: "system", content: buildBenchmarkSystemInstruction() },
          { role: "user", content: buildBenchmarkUserPayload(lead) },
        ],
        response_format: buildOpenAiJsonSchemaFormat(config.schemaStrict),
      }),
      signal: controller.signal,
    });

    const body = (await response.json()) as {
      error?: { message?: string };
      model?: string;
      choices?: { message?: { content?: string } }[];
    };

    if (!response.ok) {
      return {
        provider: config.provider,
        model: config.model,
        attempt,
        latencyMs: Math.round(performance.now() - started),
        ok: false,
        jsonParsed: false,
        schemaValid: false,
        sourcesEnforced: false,
        errorCategory: `http_${response.status}`,
      };
    }

    const content = body.choices?.[0]?.message?.content?.trim();
    const modelUsed = body.model ?? config.model;

    return scoreBenchmarkResponse(
      config.provider,
      modelUsed,
      attempt,
      Math.round(performance.now() - started),
      content,
    );
  } catch (error) {
    const category =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "provider_error";
    return {
      provider: config.provider,
      model: config.model,
      attempt,
      latencyMs: Math.round(performance.now() - started),
      ok: false,
      jsonParsed: false,
      schemaValid: false,
      sourcesEnforced: false,
      errorCategory: category,
    };
  } finally {
    clearTimeout(timer);
  }
}
