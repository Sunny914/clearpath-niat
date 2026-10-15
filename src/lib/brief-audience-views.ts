import type { N8nPreparedForReview } from "@/lib/n8n/parse-n8n-prepared-response";
import { isCounsellingCallNextStep, needsClass12Stream } from "@/lib/validate-lead-intake";
import type { BriefPersistenceStatus } from "@/types/brief-api";
import type {
  DecisionBriefResult,
  LeadIntakeFormData,
  VerifiedSourceLink,
} from "@/types/lead";

export type AudienceTab = "student" | "counsellor";

export function resolveAudienceTab(
  tab: AudienceTab,
  showCounsellor: boolean,
): AudienceTab {
  if (tab === "counsellor" && !showCounsellor) {
    return "student";
  }
  return tab;
}

export type BriefSessionContext = {
  leadReferenceId: string;
  requestId: string;
  persistence: BriefPersistenceStatus;
  lead: LeadIntakeFormData;
  brief: DecisionBriefResult;
  n8nFollowUp?: N8nPreparedForReview | null;
};

export type StudentBriefView = {
  mainConcern: string;
  evidenceBasedResponse: string[];
  verifiedSourceLinks: VerifiedSourceLink[];
  unansweredQuestionsForHumanConfirmation: string[];
  familyDiscussionQuestions: string[];
  recommendedNextAction: string;
  recommendedNextActionRationale: string;
};

export type CounsellorBriefView = {
  leadReferenceId: string;
  educationContext: string;
  statedInterests: string;
  mainConcern: string;
  applicationStatus: LeadIntakeFormData["applicationStatus"];
  unresolvedQuestions: string[];
  suggestedDiscussionTopics: string[];
  recommendedNextAction: string;
  recommendedNextActionRationale: string;
  followUpPreference: string;
  contactPermissionStatus: string;
  /** Masked digits only — never full number in UI */
  phoneOnFileMasked: string | null;
  n8nFollowUp: N8nPreparedForReview | null;
};

export function maskPhoneNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `•••• •••${digits.slice(-4)}`;
}

function formatLeadMainConcern(lead: LeadIntakeFormData): string {
  if (lead.mainConcern === "Other" && lead.mainConcernOther.trim()) {
    return lead.mainConcernOther.trim();
  }
  return lead.mainConcern;
}

export function summarizeEducationContext(lead: LeadIntakeFormData): string {
  if (lead.educationStage === "Other") {
    const other = lead.educationStageOther.trim();
    return other ? `Education: ${other}` : "Education: other (details not specified)";
  }
  let line = lead.educationStage;
  if (needsClass12Stream(lead.educationStage) && lead.class12Stream) {
    const stream =
      lead.class12Stream === "Other" && lead.class12StreamOther.trim()
        ? lead.class12StreamOther.trim()
        : lead.class12Stream;
    line += ` · ${stream}`;
  }
  if (lead.completionYear.trim()) {
    line += ` · year ${lead.completionYear.trim()}`;
  }
  if (lead.stateCity.trim()) {
    line += ` · ${lead.stateCity.trim()}`;
  }
  return line;
}

export function buildFamilyDiscussionQuestions(
  lead: LeadIntakeFormData,
): string[] {
  const items: string[] = [];
  if (lead.additionalQuestions.trim()) {
    items.push(lead.additionalQuestions.trim());
  }
  if (lead.guardianDiscussion === "Planning to" || lead.guardianDiscussion === "No") {
    items.push(
      `Discuss NIAT with a parent or guardian when you are ready (current status: ${lead.guardianDiscussion.toLowerCase()}).`,
    );
  }
  if (lead.mainConcern === "Family approval") {
    items.push(
      "What would help your family feel informed and comfortable with next steps?",
    );
  }
  if (items.length === 0) {
    items.push(
      "What questions do you and your family still have after reading the brief and official sources?",
    );
  }
  return items;
}

export function buildContactPermissionStatus(
  lead: LeadIntakeFormData,
): string {
  const followUp = lead.preferredNextStep;
  if (!isCounsellingCallNextStep(lead.preferredNextStep)) {
    return `Follow-up preference: ${followUp}. No counselling-call phone consent was requested. This app has not sent notifications or scheduled contact.`;
  }
  if (lead.counsellingContactConsent && lead.phoneNumber.trim()) {
    return `Follow-up preference: ${followUp}. Student consented to phone contact about a counselling call request. No call has been booked or confirmed by this app.`;
  }
  return `Follow-up preference: ${followUp}. Phone contact consent or number is incomplete — verify before outreach.`;
}

export function buildSuggestedDiscussionTopics(
  brief: DecisionBriefResult,
): string[] {
  const topics: string[] = [];
  const summary = brief.counsellorPreCallSummary.trim();
  if (summary) {
    topics.push(summary);
  }
  for (const question of brief.unansweredQuestionsForHumanConfirmation) {
    topics.push(question);
  }
  if (topics.length === 0) {
    topics.push("Review open items from the decision brief with the student.");
  }
  return topics;
}

export function buildStudentBriefView(
  ctx: BriefSessionContext,
): StudentBriefView {
  const { brief, lead } = ctx;
  const mainConcern =
    brief.statedConcernCategory.trim() || formatLeadMainConcern(lead);

  return {
    mainConcern,
    evidenceBasedResponse: [...brief.evidenceBasedResponse],
    verifiedSourceLinks: [...brief.verifiedSourceLinks],
    unansweredQuestionsForHumanConfirmation: [
      ...brief.unansweredQuestionsForHumanConfirmation,
    ],
    familyDiscussionQuestions: buildFamilyDiscussionQuestions(lead),
    recommendedNextAction: brief.recommendedNextAction,
    recommendedNextActionRationale: brief.recommendedNextActionRationale,
  };
}

export function buildCounsellorBriefView(
  ctx: BriefSessionContext,
): CounsellorBriefView {
  const { brief, lead, leadReferenceId } = ctx;
  const phoneOnFileMasked = lead.phoneNumber.trim()
    ? maskPhoneNumber(lead.phoneNumber)
    : null;

  return {
    leadReferenceId,
    educationContext: summarizeEducationContext(lead),
    statedInterests: `${lead.preferredStudyArea} · preferred language: ${lead.preferredLanguage}`,
    mainConcern: formatLeadMainConcern(lead),
    applicationStatus: lead.applicationStatus,
    unresolvedQuestions: [...brief.unansweredQuestionsForHumanConfirmation],
    suggestedDiscussionTopics: buildSuggestedDiscussionTopics(brief),
    recommendedNextAction: brief.recommendedNextAction,
    recommendedNextActionRationale: brief.recommendedNextActionRationale,
    followUpPreference: lead.preferredNextStep,
    contactPermissionStatus: buildContactPermissionStatus(lead),
    phoneOnFileMasked,
    n8nFollowUp: ctx.n8nFollowUp ?? null,
  };
}

/** Keys rendered in the student UI — guards against leaking counsellor-only fields. */
export const STUDENT_BRIEF_VIEW_KEYS: (keyof StudentBriefView)[] = [
  "mainConcern",
  "evidenceBasedResponse",
  "verifiedSourceLinks",
  "unansweredQuestionsForHumanConfirmation",
  "familyDiscussionQuestions",
  "recommendedNextAction",
  "recommendedNextActionRationale",
];

export function studentViewExposesCounsellorOnlyFields(
  view: StudentBriefView,
  brief: DecisionBriefResult,
): boolean {
  const serialized = JSON.stringify(view);
  if (serialized.includes(brief.counsellorPreCallSummary)) {
    return brief.counsellorPreCallSummary.trim().length > 0;
  }
  return false;
}
