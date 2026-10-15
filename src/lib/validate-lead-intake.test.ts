import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidLeadPayload,
  validateLeadIntake,
} from "@/lib/validate-lead-intake";
import type { LeadIntakeFormData } from "@/types/lead";

const FICTIONAL_PHONE = "9876543210";

const baseLead: LeadIntakeFormData = {
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
  preferredNextStep: "Receive information",
  phoneNumber: "",
  additionalQuestions: "",
  preferredLanguage: "English",
  financialContextOptional: "",
  consent: true,
  counsellingContactConsent: false,
};

describe("isValidLeadPayload", () => {
  it("accepts missing class12Stream when education stage is Other", () => {
    const withoutStream = { ...baseLead } as Record<string, unknown>;
    delete withoutStream.class12Stream;
    assert.equal(isValidLeadPayload(withoutStream), true);
  });

  it("rejects invalid class12Stream values", () => {
    assert.equal(
      isValidLeadPayload({ ...baseLead, class12Stream: "Invalid" }),
      false,
    );
  });
});

describe("conditional phone and counselling consent", () => {
  it("accepts information-only submission without phone", () => {
    assert.equal(isValidLeadPayload(baseLead), true);
    assert.equal(validateLeadIntake(baseLead), null);
  });

  it("rejects counselling call without phone or contact consent", () => {
    const counselling = {
      ...baseLead,
      preferredNextStep: "Request a counselling call" as const,
      phoneNumber: "",
      counsellingContactConsent: false,
    };
    assert.equal(isValidLeadPayload(counselling), false);
    assert.match(
      validateLeadIntake(counselling) ?? "",
      /phone number/i,
    );

    const withPhoneOnly = {
      ...counselling,
      phoneNumber: FICTIONAL_PHONE,
    };
    assert.equal(isValidLeadPayload(withPhoneOnly), false);
    assert.match(
      validateLeadIntake(withPhoneOnly) ?? "",
      /contacted by phone/i,
    );
  });

  it("accepts counselling call with fictional phone and both consents", () => {
    const counselling = {
      ...baseLead,
      preferredNextStep: "Request a counselling call" as const,
      phoneNumber: FICTIONAL_PHONE,
      counsellingContactConsent: true,
    };
    assert.equal(isValidLeadPayload(counselling), true);
    assert.equal(validateLeadIntake(counselling), null);
  });

  it("allows optional phone on non-counselling paths when valid", () => {
    const withOptionalPhone = {
      ...baseLead,
      phoneNumber: FICTIONAL_PHONE,
    };
    assert.equal(isValidLeadPayload(withOptionalPhone), true);
  });
});
