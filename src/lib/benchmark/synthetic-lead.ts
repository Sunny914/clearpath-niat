import type { LeadIntakeFormData } from "@/types/lead";

/** Fictional lead for provider comparison — no phone numbers or real PII. */
export const SYNTHETIC_BENCHMARK_LEAD: LeadIntakeFormData = {
  studentName: "BenchUser",
  educationStage: "Currently in Class 12",
  educationStageOther: "",
  class12Stream: "PCM",
  class12StreamOther: "",
  completionYear: "2026",
  stateCity: "Telangana, Hyderabad",
  preferredStudyArea: "Software development",
  mainConcern: "Fees",
  mainConcernOther: "",
  guardianDiscussion: "Planning to",
  applicationStatus: "Not applied",
  preferredNextStep: "Understand fees",
  additionalQuestions: "What official sources should we review first?",
  preferredLanguage: "English",
  financialContextOptional: "",
  phoneNumber: "",
  consent: true,
  counsellingContactConsent: false,
};
