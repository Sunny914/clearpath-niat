import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  scoreBenchmarkResponse,
  summarizeAttempts,
} from "@/lib/benchmark/score-benchmark-result";

const validBrief = {
  statedConcernCategory: "Fees",
  evidenceBasedResponse: ["Use official sources only."],
  verifiedSourceLinks: [
    { title: "NIAT", url: "https://www.niatindia.com/" },
  ],
  unansweredQuestionsForHumanConfirmation: ["Confirm fees with counsellor."],
  counsellorPreCallSummary: "Lead asked about fees.",
  recommendedNextAction: "Share official fee materials.",
  recommendedNextActionRationale: "Fees are the stated priority.",
};

describe("scoreBenchmarkResponse", () => {
  it("marks valid JSON as ok", () => {
    const result = scoreBenchmarkResponse(
      "gemini",
      "gemini-2.5-flash",
      1,
      100,
      JSON.stringify(validBrief),
    );
    assert.equal(result.ok, true);
    assert.equal(result.schemaValid, true);
    assert.equal(result.sourcesEnforced, true);
  });

  it("rejects invalid JSON", () => {
    const result = scoreBenchmarkResponse("groq", "test", 1, 50, "{bad");
    assert.equal(result.ok, false);
    assert.equal(result.errorCategory, "invalid_json_or_schema");
  });
});

describe("summarizeAttempts", () => {
  it("computes success rate and median latency", () => {
    const summary = summarizeAttempts([
      {
        provider: "gemini",
        model: "m",
        attempt: 1,
        latencyMs: 100,
        ok: true,
        jsonParsed: true,
        schemaValid: true,
        sourcesEnforced: true,
      },
      {
        provider: "gemini",
        model: "m",
        attempt: 2,
        latencyMs: 300,
        ok: true,
        jsonParsed: true,
        schemaValid: true,
        sourcesEnforced: true,
      },
    ]);
    assert.equal(summary.successRate, 1);
    assert.equal(summary.medianLatencyMs, 300);
  });
});
