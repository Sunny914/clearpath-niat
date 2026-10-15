import { APPROVED_NIAT_SOURCE_CATALOG } from "@/lib/approved-niat-knowledge";
import type { DecisionBriefResult, LeadIntakeFormData } from "@/types/lead";
import { needsClass12Stream } from "@/lib/validate-lead-intake";

const DEV_MOCK_PREFIX =
  "[Development mock — Gemini was not used. Set GEMINI_API_KEY in .env.local for live AI, or USE_MOCK_BRIEF=1 to force this mode.]";

function concernLabel(data: LeadIntakeFormData): string {
  return data.mainConcern === "Other" && data.mainConcernOther.trim()
    ? `Other: ${data.mainConcernOther.trim()}`
    : data.mainConcern;
}

function educationSummary(data: LeadIntakeFormData): string {
  if (data.educationStage === "Other") {
    return data.educationStageOther.trim() || "Education stage: other (details pending).";
  }
  let line = data.educationStage;
  if (needsClass12Stream(data.educationStage) && data.class12Stream) {
    const stream =
      data.class12Stream === "Other" && data.class12StreamOther.trim()
        ? data.class12StreamOther.trim()
        : data.class12Stream;
    line += ` · ${stream}`;
  }
  if (data.completionYear.trim()) {
    line += ` · year ${data.completionYear.trim()}`;
  }
  return line;
}

/**
 * Prototype placeholder — replace with server-side LLM + verified knowledge base.
 * Does not invent fees, affiliations, placements, or guarantees.
 */
export function generateMockBrief(
  data: LeadIntakeFormData,
  options?: { developmentMock?: boolean },
): DecisionBriefResult {
  const greeting = data.studentName.trim()
    ? data.studentName.trim()
    : "the student";

  const languageNote =
    data.preferredLanguage !== "English"
      ? `Response will be localised to ${data.preferredLanguage} once translation is connected (English placeholder below).`
      : "Response prepared in English.";

  const extraLine = data.additionalQuestions.trim()
    ? `Open question from family: “${data.additionalQuestions.trim()}” — answer only from verified materials after AI is connected.`
    : "No additional questions submitted.";

  const financialLine = data.financialContextOptional.trim()
    ? `Optional affordability context noted (not verified): “${data.financialContextOptional.trim()}”.`
    : "No optional financial context submitted.";

  const concern = concernLabel(data);

  const nextStepMap: Record<
    LeadIntakeFormData["preferredNextStep"],
    { action: string; rationale: string }
  > = {
    "Receive information": {
      action:
        "Share an official information pack and map it to the student’s study-area interest — no booking implied.",
      rationale:
        "The lead asked to receive information first; respect that pace before pushing counselling.",
    },
    "Understand fees": {
      action:
        "Arrange a fee-structure walkthrough using only official, counsellor-approved documents.",
      rationale:
        "Fees are the stated priority; verified numbers must come from human-confirmed sources, not this prototype.",
    },
    "Discuss with family": {
      action:
        "Send a family-friendly summary the student can review with a parent or guardian before any call.",
      rationale: `Guardian discussion status: ${data.guardianDiscussion}. Support joint decision-making.`,
    },
    "Request a counselling call": {
      action:
        "Offer to connect with a NIAT counsellor when the team is ready — this prototype does not schedule calls.",
      rationale:
        "The lead indicated interest in a counselling call; intake status should be honoured without claiming a call occurred.",
    },
  };

  const { action, rationale } = nextStepMap[data.preferredNextStep];

  const evidenceBasedResponse = [
    ...(options?.developmentMock ? [DEV_MOCK_PREFIX] : []),
    `Thanks for sharing context for ${greeting} (${data.stateCity.trim()}).`,
      languageNote,
      `Education: ${educationSummary(data)}.`,
      `Study interest: ${data.preferredStudyArea}.`,
      `NIAT journey so far: ${data.applicationStatus}.`,
      extraLine,
      financialLine,
      options?.developmentMock
        ? "This block is generated locally for development — not by Gemini."
        : "This prototype does not generate programme-specific claims. A connected AI layer will respond only from approved NIAT / NxtWave sources.",
  ];

  return {
    statedConcernCategory: concern,
    evidenceBasedResponse,
    verifiedSourceLinks: [...APPROVED_NIAT_SOURCE_CATALOG],
    unansweredQuestionsForHumanConfirmation: [
      concern.startsWith("Other")
        ? "Clarify the family’s primary barrier in their own words."
        : `Confirm official guidance covers “${concern}” for this intake and study area.`,
      "Exact fee structure, scholarships, and payment options (if fees matter to this lead).",
      "Degree-awarding university and eligibility for the student’s education background.",
      "Campus / mode options relevant to the student’s location and preferences.",
      data.guardianDiscussion === "No" || data.guardianDiscussion === "Planning to"
        ? "Family alignment — who needs to be on the next conversation and what would convince them."
        : "Confirm guardian expectations match what the student shared.",
      data.applicationStatus === "Unsure"
        ? "Clarify where the student is in the application / assessment pipeline."
        : `Validate self-reported status “${data.applicationStatus}” against CRM records.`,
    ],
    counsellorPreCallSummary: [
      `Prototype intake: ${concern}; ${data.preferredStudyArea}; ${data.applicationStatus}.`,
      `Education: ${educationSummary(data)}; location ${data.stateCity.trim()}.`,
      `Guardian discussion: ${data.guardianDiscussion}. Preferred next step: ${data.preferredNextStep}.`,
      extraLine,
      options?.developmentMock
        ? "Development mock summary — not produced by Gemini."
        : "Consent on file for processing submitted information. No live AI or CRM connected.",
    ].join(" "),
    recommendedNextAction: action,
    recommendedNextActionRationale: rationale,
  };
}
