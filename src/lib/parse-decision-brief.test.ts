import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enforceApprovedSources,
  normalizeDecisionBrief,
  parseDecisionBriefFromJson,
} from "@/lib/parse-decision-brief";

describe("parse-decision-brief", () => {
  const valid = {
    statedConcernCategory: "Fees",
    evidenceBasedResponse: ["One grounded point."],
    verifiedSourceLinks: [
      {
        title: "NIAT",
        url: "https://www.niatindia.com/",
      },
    ],
    unansweredQuestionsForHumanConfirmation: ["Confirm fee schedule with counsellor."],
    counsellorPreCallSummary: "Lead asked about fees.",
    recommendedNextAction: "Share official fee materials.",
    recommendedNextActionRationale: "Fees were the main concern.",
  };

  it("parses valid JSON", () => {
    const parsed = parseDecisionBriefFromJson(JSON.stringify(valid));
    assert.ok(parsed);
    assert.equal(parsed.statedConcernCategory, "Fees");
  });

  it("rejects malformed payloads", () => {
    assert.equal(normalizeDecisionBrief({}), null);
    assert.equal(parseDecisionBriefFromJson("{not-json"), null);
  });

  it("removes unapproved source URLs", () => {
    const brief = normalizeDecisionBrief({
      ...valid,
      verifiedSourceLinks: [
        { title: "Bad", url: "https://example.com/fake" },
        { title: "Good", url: "https://www.niatindia.com/" },
      ],
    });
    assert.ok(brief);
    const enforced = enforceApprovedSources(brief);
    assert.equal(enforced.verifiedSourceLinks.length, 1);
    assert.ok(
      enforced.unansweredQuestionsForHumanConfirmation.some((q) =>
        q.includes("non-approved"),
      ),
    );
  });
});
