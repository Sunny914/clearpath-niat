"use client";

import { useMemo, useState } from "react";
import { CounsellorBriefView } from "@/components/lead/CounsellorBriefView";
import { StudentBriefView } from "@/components/lead/StudentBriefView";
import {
  buildCounsellorBriefView,
  buildStudentBriefView,
  resolveAudienceTab,
  type AudienceTab,
  type BriefSessionContext,
} from "@/lib/brief-audience-views";
import type { BriefGenerationSource } from "@/types/brief-generation";

type AudienceBriefResultsProps = {
  session: BriefSessionContext;
  briefSource?: BriefGenerationSource;
};

export function AudienceBriefResults({
  session,
  briefSource,
}: AudienceBriefResultsProps) {
  const [tab, setTab] = useState<AudienceTab>("student");
  const studentView = useMemo(
    () => buildStudentBriefView(session),
    [session],
  );
  const counsellorView = useMemo(
    () => buildCounsellorBriefView(session),
    [session],
  );

  const banner =
    briefSource === "gemini"
      ? {
          title: "AI-generated brief",
          body: "Produced by Gemini using approved facts and source links only. Programme specifics may still require counsellor confirmation.",
        }
      : briefSource === "mock-development"
        ? {
            title: "Development mock",
            body: "This brief was generated locally — not by Gemini. Set GEMINI_API_KEY in .env.local for live AI output.",
          }
        : {
            title: "Decision brief",
            body: "Review verified sources and human-confirmation items before acting.",
          };

  const activeTab = resolveAudienceTab(tab, true);

  const persistenceNotice =
    session.persistence === "saved" || session.persistence === "duplicate"
      ? {
          tone: "teal" as const,
          text:
            session.persistence === "duplicate"
              ? "This submission matches an earlier saved lead. Your brief is unchanged."
              : "Your lead and brief are saved. Reference ID is shown in the counsellor preview.",
        }
      : session.persistence === "failed"
        ? {
            tone: "amber" as const,
            text: "Your brief was generated but could not be saved. You can still review it below; consider submitting again or contacting support with your request reference.",
          }
        : session.persistence === "not_configured"
          ? {
              tone: "amber" as const,
              text: "Brief generated for this session only — storage is not configured on the server.",
            }
          : null;

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 text-sm text-navy">
        <span className="font-medium">{banner.title}</span> — {banner.body}
      </div>

      {persistenceNotice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            persistenceNotice.tone === "teal"
              ? "border-teal/30 bg-teal/5 text-navy"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          {persistenceNotice.text}
        </div>
      ) : null}

      <div
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-1"
        role="tablist"
        aria-label="Brief audience view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "student"}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === "student"
              ? "bg-white text-navy shadow-sm"
              : "text-navy-muted hover:text-navy"
          }`}
          onClick={() => setTab("student")}
        >
          Student view
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "counsellor"}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            activeTab === "counsellor"
              ? "bg-white text-navy shadow-sm"
              : "text-navy-muted hover:text-navy"
          }`}
          onClick={() => setTab("counsellor")}
        >
          Counsellor preview
        </button>
      </div>

      <div role="tabpanel">
        {activeTab === "student" ? (
          <StudentBriefView view={studentView} />
        ) : (
          <CounsellorBriefView view={counsellorView} />
        )}
      </div>
    </div>
  );
}
