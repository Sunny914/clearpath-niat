/** Subset of n8n workflow success body (Respond with Recommendation). */
export type N8nPreparedForReview = {
  status: "prepared_for_review";
  concernCategory: string;
  recommendedNextAction: string;
  recommendedNextActionRationale: string;
  followUpDraft: string;
  suggestedHandling: string;
  messageSent: false;
  counsellingBooked: false;
};

export function parseN8nPreparedForReview(
  body: unknown,
): N8nPreparedForReview | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (record.status !== "prepared_for_review") {
    return null;
  }
  if (record.messageSent !== false || record.counsellingBooked !== false) {
    return null;
  }
  const concernCategory = readNonEmptyString(record.concernCategory);
  const recommendedNextAction = readNonEmptyString(record.recommendedNextAction);
  const recommendedNextActionRationale = readNonEmptyString(
    record.recommendedNextActionRationale,
  );
  const followUpDraft = readNonEmptyString(record.followUpDraft);
  const suggestedHandling = readNonEmptyString(record.suggestedHandling);
  if (
    !concernCategory ||
    !recommendedNextAction ||
    !recommendedNextActionRationale ||
    !followUpDraft ||
    !suggestedHandling
  ) {
    return null;
  }
  return {
    status: "prepared_for_review",
    concernCategory,
    recommendedNextAction,
    recommendedNextActionRationale,
    followUpDraft,
    suggestedHandling,
    messageSent: false,
    counsellingBooked: false,
  };
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
