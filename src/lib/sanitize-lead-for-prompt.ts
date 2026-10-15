import type { LeadIntakeFormData } from "@/types/lead";

const MAX_LEN = 2000;

function clean(value: string): string {
  return value
    .replace(/\0/g, "")
    .replace(/[\u2028\u2029]/g, " ")
    .slice(0, MAX_LEN)
    .trim();
}

/** Untrusted intake snapshot for model context (not instructions). */
export function sanitizeLeadForPrompt(
  data: LeadIntakeFormData,
): Record<string, string | boolean> {
  return {
    studentName: clean(data.studentName),
    educationStage: data.educationStage,
    educationStageOther: clean(data.educationStageOther),
    class12Stream: data.class12Stream,
    class12StreamOther: clean(data.class12StreamOther),
    completionYear: clean(data.completionYear),
    stateCity: clean(data.stateCity),
    preferredStudyArea: data.preferredStudyArea,
    mainConcern: data.mainConcern,
    mainConcernOther: clean(data.mainConcernOther),
    guardianDiscussion: data.guardianDiscussion,
    applicationStatus: data.applicationStatus,
    preferredNextStep: data.preferredNextStep,
    additionalQuestions: clean(data.additionalQuestions),
    preferredLanguage: data.preferredLanguage,
    financialContextOptional: clean(data.financialContextOptional),
    // phoneNumber and counsellingContactConsent are omitted — not used for brief generation.
  };
}
