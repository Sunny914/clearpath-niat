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

      {view.n8nFollowUp ? (
        <BriefViewSection
          title="Workflow follow-up draft (n8n)"
          id="counsellor-n8n-follow-up"
        >
          <p>
            <span className="font-medium text-navy">Workflow status: </span>
            Prepared for review
          </p>
          <p className="mt-2">
            <span className="font-medium text-navy">Concern category: </span>
            {view.n8nFollowUp.concernCategory}
          </p>
          <p className="mt-2">
            <span className="font-medium text-navy">Suggested handling: </span>
            {view.n8nFollowUp.suggestedHandling}
          </p>
          <p className="mt-2">
            <span className="font-medium text-navy">n8n recommendation: </span>
            {view.n8nFollowUp.recommendedNextAction}
          </p>
          <p className="mt-2">
            <span className="font-medium text-navy">n8n rationale: </span>
            {view.n8nFollowUp.recommendedNextActionRationale}
          </p>
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-surface px-3 py-3 text-sm text-navy">
            {view.n8nFollowUp.followUpDraft}
          </p>
          <p className="mt-2 text-xs text-navy-muted">
            Draft for counsellor review only. No message was sent and no counselling
            call was booked by the workflow.
          </p>
        </BriefViewSection>
      ) : null}

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
