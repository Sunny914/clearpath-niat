import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_NOT_FOUND_FALLBACK,
  geminiModelSupportsThinkingBudget,
  resolveGeminiTimeoutMs,
  resolveModelsToTry,
  shouldAttemptFallbackModel,
  shouldFallbackForModelNotFound,
} from "@/lib/gemini-config";

describe("gemini-config", () => {
  it("keeps a generous default timeout", () => {
    const prev = process.env.GEMINI_TIMEOUT_MS;
    delete process.env.GEMINI_TIMEOUT_MS;
    assert.equal(resolveGeminiTimeoutMs(), 90_000);
    process.env.GEMINI_TIMEOUT_MS = prev;
  });

  it("uses stable Flash-Lite defaults when GEMINI_MODEL is unset", () => {
    const prev = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    assert.deepEqual(resolveModelsToTry(), [
      DEFAULT_GEMINI_MODEL,
      GEMINI_MODEL_NOT_FOUND_FALLBACK,
    ]);
    assert.equal(DEFAULT_GEMINI_MODEL, "gemini-3.5-flash-lite");
    assert.equal(GEMINI_MODEL_NOT_FOUND_FALLBACK, "gemini-3.8-flash");
    process.env.GEMINI_MODEL = prev;
  });

  it("uses only GEMINI_MODEL when set", () => {
    const prev = process.env.GEMINI_MODEL;
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    assert.deepEqual(resolveModelsToTry(), ["gemini-3.8-flash"]);
    process.env.GEMINI_MODEL = prev;
  });

  it("does not attach thinking budget to Flash-Lite models", () => {
    assert.equal(geminiModelSupportsThinkingBudget("gemini-3.5-flash-lite"), false);
    assert.equal(geminiModelSupportsThinkingBudget("gemini-3.8-flash"), true);
  });
});

describe("gemini-config fallback", () => {
  it("allows fallback only for model-not-found errors", () => {
    assert.equal(
      shouldFallbackForModelNotFound(
        new Error('{"error":{"code":404,"message":"model not found"}}'),
      ),
      true,
    );
    assert.equal(
      shouldFallbackForModelNotFound({ status: 404, message: "Not found" }),
      true,
    );
    assert.equal(
      shouldFallbackForModelNotFound(
        new Error('{"error":{"code":503,"message":"UNAVAILABLE"}}'),
      ),
      false,
    );
  });

  it("does not fallback when GEMINI_MODEL is explicitly set", () => {
    assert.equal(
      shouldAttemptFallbackModel(
        new Error('{"error":{"code":404}}'),
        "custom-model",
        "custom-model",
        ["custom-model", "other"],
      ),
      false,
    );
  });

  it("fallbacks to second model on 404 when using defaults", () => {
    assert.equal(
      shouldAttemptFallbackModel(
        new Error("no longer available"),
        undefined,
        DEFAULT_GEMINI_MODEL,
        [DEFAULT_GEMINI_MODEL, GEMINI_MODEL_NOT_FOUND_FALLBACK],
      ),
      true,
    );
  });
});
