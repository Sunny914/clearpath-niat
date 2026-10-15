import type { VerifiedSourceLink } from "@/types/lead";

/**
 * Curated facts ClearPath may cite. Expand only with team-approved wording.
 * Do not add specific fees, statistics, or guarantees here without sign-off.
 */
export const APPROVED_NIAT_FACTS: readonly string[] = [
  "ClearPath NIAT supports students and families exploring NIAT; it does not replace official NIAT counselling or contracts.",
  "Programme, admission, fee, campus, university-affiliation, and career-outcome details must come from official NIAT / NxtWave materials or a NIAT counsellor — never from guesswork.",
  "When official evidence for a lead’s question is not included below, the brief must say so and route the topic to human confirmation.",
];

/** Only these URLs may appear in verifiedSourceLinks returned to the client. */
export const APPROVED_NIAT_SOURCE_CATALOG: readonly VerifiedSourceLink[] = [
  {
    title: "NIAT India — official website",
    url: "https://www.niatindia.com/",
    note: "Primary official property for NIAT programme information.",
  },
  {
    title: "NxtWave — official website",
    url: "https://www.nxtwave.tech/",
    note: "Official NxtWave company information.",
  },
];

const normalizedCatalogUrls = new Set(
  APPROVED_NIAT_SOURCE_CATALOG.map((s) => normalizeSourceUrl(s.url)),
);

export function normalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "") || "";
    return `${parsed.origin}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function isApprovedSourceUrl(url: string): boolean {
  const normalized = normalizeSourceUrl(url);
  if (normalizedCatalogUrls.has(normalized)) return true;
  for (const approved of normalizedCatalogUrls) {
    if (normalized.startsWith(approved)) return true;
  }
  return false;
}

export function catalogEntryForUrl(url: string): VerifiedSourceLink | undefined {
  const normalized = normalizeSourceUrl(url);
  return APPROVED_NIAT_SOURCE_CATALOG.find(
    (entry) => normalizeSourceUrl(entry.url) === normalized,
  );
}
