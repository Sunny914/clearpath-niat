import {
  APPLICATION_STATUSES,
  CLASS_12_STREAMS,
  EDUCATION_STAGES,
  GUARDIAN_DISCUSSION,
  LANGUAGES,
  MAIN_CONCERNS,
  PREFERRED_NEXT_STEPS,
  PREFERRED_STUDY_AREAS,
  type FormStepId,
  type LeadIntakeFormData,
  type PreferredNextStep,
} from "@/types/lead";

export function isCounsellingCallNextStep(step: PreferredNextStep): boolean {
  return step === "Request a counselling call";
}

/** Fictional example for tests: 9876543210 */
export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return true;
  if (digits.length === 12 && digits.startsWith("91") && /^91[6-9]/.test(digits)) {
    return true;
  }
  return false;
}

export function validatePhoneForLead(data: LeadIntakeFormData): string | null {
  const trimmed = data.phoneNumber.trim();
  const counselling = isCounsellingCallNextStep(data.preferredNextStep);

  if (counselling) {
    if (!trimmed) {
      return "Enter a phone number so we can follow up on your counselling request.";
    }
    if (!isValidPhoneNumber(trimmed)) {
      return "Enter a valid 10-digit Indian mobile number (optional +91).";
    }
    return null;
  }

  if (trimmed && !isValidPhoneNumber(trimmed)) {
    return "Enter a valid 10-digit Indian mobile number, or leave this blank.";
  }
  return null;
}

export function needsClass12Stream(stage: LeadIntakeFormData["educationStage"]): boolean {
  return (
    stage === "Currently in Class 12" || stage === "Completed Class 12"
  );
}

export function needsCompletionYear(stage: LeadIntakeFormData["educationStage"]): boolean {
  return stage === "Completed Class 12" || stage === "Currently in Class 12";
}

function isValidYear(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  const current = new Date().getFullYear();
  return year >= current - 8 && year <= current + 4;
}

export function validateStep(
  step: FormStepId,
  data: LeadIntakeFormData,
): string | null {
  switch (step) {
    case 1: {
      if (!EDUCATION_STAGES.includes(data.educationStage)) {
        return "Select your current education stage.";
      }
      if (
        data.educationStage === "Other" &&
        !data.educationStageOther.trim()
      ) {
        return "Briefly describe your education stage.";
      }
      if (needsClass12Stream(data.educationStage)) {
        if (
          !data.class12Stream ||
          !CLASS_12_STREAMS.includes(data.class12Stream)
        ) {
          return "Select your Class 12 stream.";
        }
        if (
          data.class12Stream === "Other" &&
          !data.class12StreamOther.trim()
        ) {
          return "Briefly describe your stream.";
        }
      }
      if (needsCompletionYear(data.educationStage)) {
        if (!data.completionYear.trim()) {
          return data.educationStage === "Currently in Class 12"
            ? "Enter your expected Class 12 completion year."
            : "Enter your Class 12 completion year.";
        }
        if (!isValidYear(data.completionYear.trim())) {
          return "Enter a valid four-digit year.";
        }
      }
      if (!data.stateCity.trim()) {
        return "Enter your state or city.";
      }
      return null;
    }
    case 2: {
      if (!PREFERRED_STUDY_AREAS.includes(data.preferredStudyArea)) {
        return "Select a preferred study area.";
      }
      if (!MAIN_CONCERNS.includes(data.mainConcern)) {
        return "Select your main concern.";
      }
      if (data.mainConcern === "Other" && !data.mainConcernOther.trim()) {
        return "Briefly describe your main concern.";
      }
      if (!GUARDIAN_DISCUSSION.includes(data.guardianDiscussion)) {
        return "Let us know if you have discussed NIAT with a parent or guardian.";
      }
      if (!APPLICATION_STATUSES.includes(data.applicationStatus)) {
        return "Select your application or counselling status.";
      }
      return null;
    }
    case 3: {
      if (!PREFERRED_NEXT_STEPS.includes(data.preferredNextStep)) {
        return "Select your preferred next step.";
      }
      const phoneError = validatePhoneForLead(data);
      if (phoneError) return phoneError;
      if (isCounsellingCallNextStep(data.preferredNextStep)) {
        if (!data.counsellingContactConsent) {
          return "Please confirm consent to be contacted by phone about your counselling request.";
        }
      }
      if (!LANGUAGES.includes(data.preferredLanguage)) {
        return "Select your preferred language.";
      }
      if (!data.consent) {
        return "Please confirm consent to process the submitted information for your decision brief.";
      }
      return null;
    }
    default:
      return "Invalid step.";
  }
}

export function validateLeadIntake(data: LeadIntakeFormData): string | null {
  for (const step of [1, 2, 3] as FormStepId[]) {
    const error = validateStep(step, data);
    if (error) return error;
  }
  return null;
}

const stringFields: (keyof LeadIntakeFormData)[] = [
  "studentName",
  "educationStageOther",
  "class12StreamOther",
  "completionYear",
  "stateCity",
  "mainConcernOther",
  "phoneNumber",
  "additionalQuestions",
  "financialContextOptional",
];

export function isValidLeadPayload(body: unknown): body is LeadIntakeFormData {
  if (!body || typeof body !== "object") return false;
  const data = body as Record<string, unknown>;

  for (const key of stringFields) {
    if (typeof data[key] !== "string") return false;
  }
  if (typeof data.consent !== "boolean") return false;
  if (typeof data.counsellingContactConsent !== "boolean") return false;

  if (!EDUCATION_STAGES.includes(data.educationStage as LeadIntakeFormData["educationStage"])) {
    return false;
  }
  if (
    data.class12Stream !== undefined &&
    data.class12Stream !== null &&
    typeof data.class12Stream !== "string"
  ) {
    return false;
  }
  const stream =
    typeof data.class12Stream === "string" ? data.class12Stream : "";
  if (
    stream !== "" &&
    !(CLASS_12_STREAMS as readonly string[]).includes(stream)
  ) {
    return false;
  }
  if (!PREFERRED_STUDY_AREAS.includes(data.preferredStudyArea as LeadIntakeFormData["preferredStudyArea"])) {
    return false;
  }
  if (!MAIN_CONCERNS.includes(data.mainConcern as LeadIntakeFormData["mainConcern"])) {
    return false;
  }
  if (!GUARDIAN_DISCUSSION.includes(data.guardianDiscussion as LeadIntakeFormData["guardianDiscussion"])) {
    return false;
  }
  if (!APPLICATION_STATUSES.includes(data.applicationStatus as LeadIntakeFormData["applicationStatus"])) {
    return false;
  }
  if (!PREFERRED_NEXT_STEPS.includes(data.preferredNextStep as LeadIntakeFormData["preferredNextStep"])) {
    return false;
  }
  if (!LANGUAGES.includes(data.preferredLanguage as LeadIntakeFormData["preferredLanguage"])) {
    return false;
  }

  return validateLeadIntake(body as LeadIntakeFormData) === null;
}
