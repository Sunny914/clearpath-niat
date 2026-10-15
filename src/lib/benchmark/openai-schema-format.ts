import { DECISION_BRIEF_JSON_SCHEMA } from "@/lib/decision-brief-schema";

/** OpenAI-compatible chat `response_format` for Groq / OpenRouter structured outputs. */
export function buildOpenAiJsonSchemaFormat(strict: boolean) {
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "decision_brief",
      strict,
      schema: DECISION_BRIEF_JSON_SCHEMA,
    },
  };
}
