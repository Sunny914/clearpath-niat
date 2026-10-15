import {
  APPROVED_NIAT_SOURCE_CATALOG,
  catalogEntryForUrl,
  isApprovedSourceUrl,
} from "@/lib/approved-niat-knowledge";
import type { DecisionBriefResult, VerifiedSourceLink } from "@/types/lead";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function parseSourceLinks(value: unknown): VerifiedSourceLink[] | null {
  if (!Array.isArray(value)) return null;
  const links: VerifiedSourceLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (!isNonEmptyString(row.title) || !isNonEmptyString(row.url)) return null;
    links.push({
      title: row.title.trim(),
      url: row.url.trim(),
      ...(isNonEmptyString(row.note) ? { note: row.note.trim() } : {}),
    });
  }
  return links;
}

export function normalizeDecisionBrief(raw: unknown): DecisionBriefResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  if (!isNonEmptyString(data.statedConcernCategory)) return null;
  if (!isStringArray(data.evidenceBasedResponse)) return null;
  const verifiedSourceLinks = parseSourceLinks(data.verifiedSourceLinks);
  if (!verifiedSourceLinks) return null;
  if (!isStringArray(data.unansweredQuestionsForHumanConfirmation)) return null;
  if (!isNonEmptyString(data.counsellorPreCallSummary)) return null;
  if (!isNonEmptyString(data.recommendedNextAction)) return null;
  if (!isNonEmptyString(data.recommendedNextActionRationale)) return null;

  return {
    statedConcernCategory: data.statedConcernCategory.trim(),
    evidenceBasedResponse: data.evidenceBasedResponse.map((s) => s.trim()),
    verifiedSourceLinks,
    unansweredQuestionsForHumanConfirmation:
      data.unansweredQuestionsForHumanConfirmation.map((s) => s.trim()),
    counsellorPreCallSummary: data.counsellorPreCallSummary.trim(),
    recommendedNextAction: data.recommendedNextAction.trim(),
    recommendedNextActionRationale:
      data.recommendedNextActionRationale.trim(),
  };
}

export function parseDecisionBriefFromJson(text: string): DecisionBriefResult | null {
  try {
    return normalizeDecisionBrief(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * Strip unapproved URLs and align titles with the catalog. Never invent new URLs.
 */
export function enforceApprovedSources(
  brief: DecisionBriefResult,
): DecisionBriefResult {
  const approvedLinks: VerifiedSourceLink[] = [];
  const rejected: string[] = [];

  for (const link of brief.verifiedSourceLinks) {
    if (isApprovedSourceUrl(link.url)) {
      const catalog = catalogEntryForUrl(link.url);
      approvedLinks.push(
        catalog
          ? { ...catalog, note: link.note ?? catalog.note }
          : link,
      );
    } else {
      rejected.push(link.url);
    }
  }

  const unanswered = [...brief.unansweredQuestionsForHumanConfirmation];
  if (rejected.length > 0) {
    unanswered.push(
      "Model referenced non-approved source URL(s); counsellor to share only official NIAT / NxtWave links.",
    );
  }

  const verifiedSourceLinks =
    approvedLinks.length > 0
      ? approvedLinks
      : [...APPROVED_NIAT_SOURCE_CATALOG];

  return {
    ...brief,
    verifiedSourceLinks,
    unansweredQuestionsForHumanConfirmation: unanswered,
  };
}
