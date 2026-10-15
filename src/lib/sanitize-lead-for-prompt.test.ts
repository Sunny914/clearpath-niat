import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeLeadForPrompt } from "@/lib/sanitize-lead-for-prompt";
import type { LeadIntakeFormData } from "@/types/lead";

describe("sanitizeLeadForPrompt", () => {
  it("omits phone number and counselling contact consent from model context", () => {
    const lead: LeadIntakeFormData = {
      studentName: "Test Student",
      educationStage: "Other",
      educationStageOther: "Gap year",
      class12Stream: "",
      class12StreamOther: "",
      completionYear: "",
      stateCity: "Hyderabad",
      preferredStudyArea: "Undecided",
      mainConcern: "Fees",
      mainConcernOther: "",
      guardianDiscussion: "Yes",
      applicationStatus: "Not applied",
      preferredNextStep: "Request a counselling call",
      phoneNumber: "9876543210",
      additionalQuestions: "",
      preferredLanguage: "English",
      financialContextOptional: "",
      consent: true,
      counsellingContactConsent: true,
    };

    const sanitized = sanitizeLeadForPrompt(lead);
    assert.equal("phoneNumber" in sanitized, false);
    assert.equal("counsellingContactConsent" in sanitized, false);
    assert.equal("consent" in sanitized, false);
    assert.equal(sanitized.preferredNextStep, "Request a counselling call");
  });
});
