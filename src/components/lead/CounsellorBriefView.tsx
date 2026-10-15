import type { CounsellorBriefView as CounsellorBriefViewModel } from "@/lib/brief-audience-views";
import { BriefViewSection } from "@/components/lead/BriefViewSection";

type CounsellorBriefViewProps = {
  view: CounsellorBriefViewModel;
};

export function CounsellorBriefView({ view }: CounsellorBriefViewProps) {
  return (
    <div className="space-y-4" data-audience="counsellor">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <span className="font-medium">Staff preview</span> — for counsellor use
        only. Do not share this panel with students. Contact details are masked.
      </div>

      <BriefViewSection title="Lead reference ID" id="counsellor-ref">
        <p className="font-mono text-sm text-navy">{view.leadReferenceId}</p>
      </BriefViewSection>

      <BriefViewSection title="Education context" id="counsellor-education">
        <p>{view.educationContext}</p>
        <p className="mt-2">
          <span className="font-medium text-navy">Stated interests: </span>
          {view.statedInterests}
        </p>
      </BriefViewSection>

      <BriefViewSection title="Main concern and application status" id="counsellor-status">
        <p>
          <span className="font-medium text-navy">Concern: </span>
          {view.mainConcern}
        </p>
        <p className="mt-2">
          <span className="font-medium text-navy">Application status: </span>
          {view.applicationStatus}
        </p>
      </BriefViewSection>

      <BriefViewSection title="Unresolved questions" id="counsellor-unresolved">
        <ul className="list-disc space-y-2 pl-5">
          {view.unresolvedQuestions.map((item, index) => (
            <li key={`${index}-${item.slice(0, 48)}`}>{item}</li>
          ))}
        </ul>
      </BriefViewSection>

      <BriefViewSection title="Suggested discussion topics" id="counsellor-topics">
        <ul className="list-disc space-y-2 pl-5">
          {view.suggestedDiscussionTopics.map((item, index) => (
            <li key={`${index}-${item.slice(0, 48)}`}>{item}</li>
          ))}
        </ul>
      </BriefViewSection>

      <BriefViewSection title="Recommended action" id="counsellor-action">
        <p className="font-medium text-navy">{view.recommendedNextAction}</p>
        <p className="mt-2">
          <span className="font-medium text-navy">Rationale: </span>
          {view.recommendedNextActionRationale}
        </p>
      </BriefViewSection>

      <BriefViewSection
        title="Follow-up preference and contact permission"
        id="counsellor-contact"
      >
        <p>
          <span className="font-medium text-navy">Follow-up preference: </span>
          {view.followUpPreference}
        </p>
        <p className="mt-2">{view.contactPermissionStatus}</p>
        <p className="mt-2">
          <span className="font-medium text-navy">Phone on file: </span>
          {view.phoneOnFileMasked ?? "Not provided"}
        </p>
      </BriefViewSection>
    </div>
  );
}
