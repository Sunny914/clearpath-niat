"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AudienceBriefResults } from "@/components/lead/AudienceBriefResults";
import { LeadIntakeForm } from "@/components/lead/LeadIntakeForm";
import { Button } from "@/components/ui/Button";
import type { BriefSessionContext } from "@/lib/brief-audience-views";
import type { BriefGenerationSource } from "@/types/brief-generation";

export function HomePage() {
  const [session, setSession] = useState<BriefSessionContext | null>(null);
  const [briefSource, setBriefSource] = useState<
    BriefGenerationSource | undefined
  >(undefined);
  const formSectionRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const scrollToResults = useCallback(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function handleSuccess(
    _brief: BriefSessionContext["brief"],
    meta: {
      briefSource?: BriefGenerationSource;
      session: BriefSessionContext;
    },
  ) {
    setSession(meta.session);
    setBriefSource(meta.briefSource);
  }

  useEffect(() => {
    if (!session) return;
    const frame = requestAnimationFrame(() => {
      scrollToResults();
    });
    return () => cancelAnimationFrame(frame);
  }, [session, scrollToResults]);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-gradient-to-b from-surface to-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <p className="text-sm font-medium uppercase tracking-wide text-teal">
              NxtWave Growth Hack Challenge
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              ClearPath NIAT
            </h1>
            <p className="mt-4 max-w-xl text-lg text-navy-muted">
              Helping students and families make informed education decisions.
            </p>
            <div className="mt-8">
              <Button type="button" onClick={scrollToForm}>
                Create Your Decision Brief
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 sm:py-16">
          <section ref={formSectionRef} id="intake" aria-label="Lead intake form">
            <LeadIntakeForm
              onSuccess={handleSuccess}
              onViewResults={scrollToResults}
            />
          </section>

          <section
            ref={resultsRef}
            id="results"
            aria-label="Decision brief results"
            className={session ? undefined : "opacity-100"}
          >
            <h2 className="mb-6 text-2xl font-semibold text-navy">
              Your decision brief
            </h2>
            {session ? (
              <AudienceBriefResults
                session={session}
                briefSource={briefSource}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-navy-muted">
                Complete the form above to see your identified concern, brief
                sections, source links, and recommended next action here.
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
