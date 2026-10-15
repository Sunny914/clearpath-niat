import type { StudentBriefView as StudentBriefViewModel } from "@/lib/brief-audience-views";
import { BriefViewSection } from "@/components/lead/BriefViewSection";

type StudentBriefViewProps = {
  view: StudentBriefViewModel;
};

export function StudentBriefView({ view }: StudentBriefViewProps) {
  return (
    <div className="space-y-4" data-audience="student">
      <BriefViewSection title="Your main concern" id="student-concern">
        <p className="font-medium text-navy">{view.mainConcern}</p>
      </BriefViewSection>

      <BriefViewSection
        title="Evidence-based personalised response"
        id="student-evidence"
      >
        <ul className="list-disc space-y-2 pl-5">
          {view.evidenceBasedResponse.map((paragraph, index) => (
            <li key={`${index}-${paragraph.slice(0, 48)}`}>{paragraph}</li>
          ))}
        </ul>
      </BriefViewSection>

      <BriefViewSection title="Approved official source links" id="student-sources">
        <ul className="space-y-3">
          {view.verifiedSourceLinks.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-teal underline-offset-2 hover:underline"
              >
                {link.title}
              </a>
              {link.note ? (
                <p className="mt-1 text-xs text-navy-muted">{link.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </BriefViewSection>

      <BriefViewSection
        title="Unanswered questions requiring human confirmation"
        id="student-human"
      >
        <ul className="list-disc space-y-2 pl-5">
          {view.unansweredQuestionsForHumanConfirmation.map((item, index) => (
            <li key={`${index}-${item.slice(0, 48)}`}>{item}</li>
          ))}
        </ul>
      </BriefViewSection>

      <BriefViewSection
        title="Questions to discuss with family"
        id="student-family"
      >
        <ul className="list-disc space-y-2 pl-5">
          {view.familyDiscussionQuestions.map((item, index) => (
            <li key={`${index}-${item.slice(0, 48)}`}>{item}</li>
          ))}
        </ul>
      </BriefViewSection>

      <BriefViewSection title="Recommended next action" id="student-action">
        <p className="font-medium text-navy">{view.recommendedNextAction}</p>
        <p className="mt-2 text-navy-muted">
          <span className="font-medium text-navy">Why this helps: </span>
          {view.recommendedNextActionRationale}
        </p>
        <p className="mt-3 text-xs text-navy-muted">
          This is guidance only — it does not book counselling, calls, or
          notifications.
        </p>
      </BriefViewSection>
    </div>
  );
}
