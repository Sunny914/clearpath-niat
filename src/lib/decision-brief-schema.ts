/** JSON Schema passed to Gemini `responseJsonSchema` for structured output. */
export const DECISION_BRIEF_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "statedConcernCategory",
    "evidenceBasedResponse",
    "verifiedSourceLinks",
    "unansweredQuestionsForHumanConfirmation",
    "counsellorPreCallSummary",
    "recommendedNextAction",
    "recommendedNextActionRationale",
  ],
  properties: {
    statedConcernCategory: { type: "string" },
    evidenceBasedResponse: {
      type: "array",
      items: { type: "string" },
    },
    verifiedSourceLinks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    unansweredQuestionsForHumanConfirmation: {
      type: "array",
      items: { type: "string" },
    },
    counsellorPreCallSummary: { type: "string" },
    recommendedNextAction: { type: "string" },
    recommendedNextActionRationale: { type: "string" },
  },
} as const;
