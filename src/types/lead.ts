export const LANGUAGES = ["English", "Hindi", "Telugu"] as const;
export type PreferredLanguage = (typeof LANGUAGES)[number];

export const EDUCATION_STAGES = [
  "Currently in Class 12",
  "Completed Class 12",
  "Other",
] as const;
export type EducationStage = (typeof EDUCATION_STAGES)[number];

export const CLASS_12_STREAMS = [
  "PCM",
  "PCB",
  "Commerce",
  "Arts",
  "Other",
] as const;
export type Class12Stream = (typeof CLASS_12_STREAMS)[number];

export const PREFERRED_STUDY_AREAS = [
  "AI/ML",
  "Software development",
  "Data science",
  "Robotics",
  "Undecided",
] as const;
export type PreferredStudyArea = (typeof PREFERRED_STUDY_AREAS)[number];

export const MAIN_CONCERNS = [
  "Fees",
  "Degree-awarding university",
  "Campus",
  "Career outcomes",
  "Eligibility / admission",
  "Family approval",
  "Comparison with other colleges",
  "Not ready to decide",
  "Other",
] as const;
export type MainConcern = (typeof MAIN_CONCERNS)[number];

export const GUARDIAN_DISCUSSION = ["Yes", "No", "Planning to"] as const;
export type GuardianDiscussion = (typeof GUARDIAN_DISCUSSION)[number];

export const APPLICATION_STATUSES = [
  "Not applied",
  "Applied",
  "Assessment completed",
  "Counselling completed",
  "Unsure",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PREFERRED_NEXT_STEPS = [
  "Receive information",
  "Understand fees",
  "Discuss with family",
  "Request a counselling call",
] as const;
export type PreferredNextStep = (typeof PREFERRED_NEXT_STEPS)[number];

export type LeadIntakeFormData = {
  /** Optional; use fictional names during testing only */
  studentName: string;
  educationStage: EducationStage;
  educationStageOther: string;
  class12Stream: Class12Stream | "";
  class12StreamOther: string;
  completionYear: string;
  stateCity: string;
  preferredStudyArea: PreferredStudyArea;
  mainConcern: MainConcern;
  mainConcernOther: string;
  guardianDiscussion: GuardianDiscussion;
  applicationStatus: ApplicationStatus;
  preferredNextStep: PreferredNextStep;
  /** Optional except when preferredNextStep is counselling call */
  phoneNumber: string;
  additionalQuestions: string;
  preferredLanguage: PreferredLanguage;
  /** Optional context for affordability — no account numbers or IDs */
  financialContextOptional: string;
  /** General data processing for the decision brief */
  consent: boolean;
  /** Separate consent to be contacted by phone about a counselling call request */
  counsellingContactConsent: boolean;
};

export type VerifiedSourceLink = {
  title: string;
  url: string;
  note?: string;
};

export type DecisionBriefResult = {
  statedConcernCategory: string;
  evidenceBasedResponse: string[];
  verifiedSourceLinks: VerifiedSourceLink[];
  unansweredQuestionsForHumanConfirmation: string[];
  counsellorPreCallSummary: string;
  recommendedNextAction: string;
  recommendedNextActionRationale: string;
};

export const FORM_STEPS = [
  { id: 1, title: "About You" },
  { id: 2, title: "Your Decision" },
  { id: 3, title: "Your Next Step" },
] as const;

export type FormStepId = (typeof FORM_STEPS)[number]["id"];
