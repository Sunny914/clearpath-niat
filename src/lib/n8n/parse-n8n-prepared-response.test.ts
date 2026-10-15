import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseN8nPreparedForReview } from "@/lib/n8n/parse-n8n-prepared-response";

const validBody = {
  ok: true,
  status: "prepared_for_review",
  concernCategory: "Fees",
  recommendedNextAction: "Review official fee materials.",
  recommendedNextActionRationale: "Fees were the priority.",
  suggestedHandling: "Information follow-up for human review",
  followUpDraft: "Suggested next action: Review official fee materials.",
  messageSent: false,
  counsellingBooked: false,
};

describe("parseN8nPreparedForReview", () => {
  it("parses workflow success body", () => {
    const parsed = parseN8nPreparedForReview(validBody);
    assert.ok(parsed);
    assert.equal(parsed.status, "prepared_for_review");
    assert.equal(parsed.concernCategory, "Fees");
    assert.match(parsed.followUpDraft, /Suggested next action/);
    assert.equal(parsed.messageSent, false);
    assert.equal(parsed.counsellingBooked, false);
  });

  it("rejects missing draft or wrong flags", () => {
    assert.equal(parseN8nPreparedForReview(null), null);
    assert.equal(
      parseN8nPreparedForReview({ ...validBody, status: "rejected" }),
      null,
    );
    assert.equal(
      parseN8nPreparedForReview({ ...validBody, messageSent: true }),
      null,
    );
    assert.equal(
      parseN8nPreparedForReview({ ...validBody, followUpDraft: "  " }),
      null,
    );
  });
});
