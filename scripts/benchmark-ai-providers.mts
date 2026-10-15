import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile, hasEnvKey } from "@/lib/benchmark/load-env-file";
import { SYNTHETIC_BENCHMARK_LEAD } from "@/lib/benchmark/synthetic-lead";
import { runGeminiBenchmarkAttempt } from "@/lib/benchmark/providers/run-gemini-benchmark";
import { runOpenAiCompatibleBenchmarkAttempt } from "@/lib/benchmark/providers/run-openai-compatible-benchmark";
import {
  summarizeAttempts,
  type BenchmarkAttemptResult,
} from "@/lib/benchmark/score-benchmark-result";
import {
  BENCHMARK_GEMINI_FALLBACK,
  resolveBenchmarkGeminiPrimary,
} from "@/lib/benchmark/gemini-benchmark-config";

const ATTEMPTS = 2;
const TIMEOUT_MS = Number(process.env.BENCHMARK_TIMEOUT_MS) || 90_000;

/** Groq: self-serve free tier; json_schema on GPT-OSS / Qwen per console.groq.com/docs/structured-outputs */
const GROQ_MODEL =
  process.env.BENCHMARK_GROQ_MODEL?.trim() || "openai/gpt-oss-20b";

/** OpenRouter: free instruct variant; verify structured_outputs on model page */
const OPENROUTER_MODEL =
  process.env.BENCHMARK_OPENROUTER_MODEL?.trim() ||
  "meta-llama/llama-3.3-70b-instruct:free";

loadEnvFile(".env.local");

const BENCHMARK_GEMINI_PRIMARY = resolveBenchmarkGeminiPrimary();

async function runProvider(
  label: string,
  runner: (attempt: number) => Promise<BenchmarkAttemptResult>,
): Promise<BenchmarkAttemptResult[]> {
  const results: BenchmarkAttemptResult[] = [];
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    process.stdout.write(`  ${label} attempt ${attempt}/${ATTEMPTS}…\n`);
    results.push(await runner(attempt));
  }
  return results;
}

function printSummary(all: BenchmarkAttemptResult[]) {
  const byProvider = new Map<string, BenchmarkAttemptResult[]>();
  for (const row of all) {
    const list = byProvider.get(row.provider) ?? [];
    list.push(row);
    byProvider.set(row.provider, list);
  }

  console.log("\n=== Provider comparison (synthetic lead, same prompt/schema) ===\n");
  for (const [provider, rows] of byProvider) {
    const summary = summarizeAttempts(rows);
    const model = rows[0]?.model ?? "n/a";
    console.log(`${provider} (model: ${model})`);
    console.log(
      `  success: ${(summary.successRate * 100).toFixed(0)}% (${summary.attempts - summary.errors.length}/${summary.attempts})`,
    );
    console.log(
      `  latency ms (ok runs): avg=${summary.avgLatencyMs ?? "n/a"} median=${summary.medianLatencyMs ?? "n/a"}`,
    );
    if (summary.errors.length > 0) {
      console.log(`  errors: ${summary.errors.join(", ")}`);
    }
    console.log("");
  }
}

async function main() {
  console.log("ClearPath NIAT — AI provider benchmark (production route unchanged)\n");
  console.log(`Attempts per provider: ${ATTEMPTS}, timeout: ${TIMEOUT_MS}ms\n`);

  const all: BenchmarkAttemptResult[] = [];

  if (hasEnvKey("GEMINI_API_KEY")) {
    const key = process.env.GEMINI_API_KEY!.trim();
    all.push(
      ...(await runProvider("Gemini", (attempt) =>
        runGeminiBenchmarkAttempt(
          SYNTHETIC_BENCHMARK_LEAD,
          key,
          attempt,
          TIMEOUT_MS,
        ),
      )),
    );
  } else {
    console.log("Skip Gemini — GEMINI_API_KEY not set\n");
  }

  if (hasEnvKey("GROQ_API_KEY")) {
    const key = process.env.GROQ_API_KEY!.trim();
    all.push(
      ...(await runProvider("Groq", (attempt) =>
        runOpenAiCompatibleBenchmarkAttempt(
          SYNTHETIC_BENCHMARK_LEAD,
          {
            provider: "groq",
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: key,
            model: GROQ_MODEL,
            schemaStrict: false,
          },
          attempt,
          TIMEOUT_MS,
        ),
      )),
    );
  } else {
    console.log("Skip Groq — GROQ_API_KEY not set\n");
  }

  if (hasEnvKey("OPENROUTER_API_KEY")) {
    const key = process.env.OPENROUTER_API_KEY!.trim();
    all.push(
      ...(await runProvider("OpenRouter", (attempt) =>
        runOpenAiCompatibleBenchmarkAttempt(
          SYNTHETIC_BENCHMARK_LEAD,
          {
            provider: "openrouter",
            url: "https://openrouter.ai/api/v1/chat/completions",
            apiKey: key,
            model: OPENROUTER_MODEL,
            schemaStrict: false,
            extraHeaders: {
              "HTTP-Referer": "https://clearpath-niat.local/benchmark",
              "X-Title": "ClearPath NIAT Benchmark",
            },
          },
          attempt,
          TIMEOUT_MS,
        ),
      )),
    );
  } else {
    console.log("Skip OpenRouter — OPENROUTER_API_KEY not set\n");
  }

  if (all.length === 0) {
    console.error("No provider keys configured. Add keys to .env.local (server-side only).");
    process.exit(1);
  }

  printSummary(all);

  const outPath = resolve(process.cwd(), "benchmark-results.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        attemptsPerProvider: ATTEMPTS,
        timeoutMs: TIMEOUT_MS,
        models: {
          gemini: `${BENCHMARK_GEMINI_PRIMARY} (fallback ${BENCHMARK_GEMINI_FALLBACK})`,
          groq: GROQ_MODEL,
          openrouter: OPENROUTER_MODEL,
        },
        productionNote:
          "/api/brief uses GEMINI_MODEL or default gemini-3.5-flash-lite (404 fallback gemini-3.8-flash).",
        results: all,
        summaries: Object.fromEntries(
          [...new Set(all.map((r) => r.provider))].map((p) => [
            p,
            summarizeAttempts(all.filter((r) => r.provider === p)),
          ]),
        ),
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${outPath} (gitignored)\n`);

  const ranked = [...new Set(all.map((r) => r.provider))]
    .map((provider) => ({
      provider,
      summary: summarizeAttempts(all.filter((r) => r.provider === provider)),
    }))
    .sort((a, b) => {
      if (b.summary.successRate !== a.summary.successRate) {
        return b.summary.successRate - a.summary.successRate;
      }
      return (a.summary.medianLatencyMs ?? Infinity) -
        (b.summary.medianLatencyMs ?? Infinity);
    });

  console.log("Recommendation (this run only, not a universal benchmark):");
  const best = ranked[0];
  if (best && best.summary.successRate > 0) {
    console.log(
      `  Prefer ${best.provider} for lowest median latency among successful runs, if quality checks in app remain acceptable.`,
    );
  } else {
    console.log(
      "  No provider completed successfully in this run — check keys, quotas, and model IDs.",
    );
  }
  console.log(
    "  Production remains Gemini via /api/brief until you explicitly switch providers.",
  );
}

main().catch((error) => {
  console.error("Benchmark failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
