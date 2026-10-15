"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormProgress } from "@/components/lead/FormProgress";
import {
  BRIEF_SOURCE_HEADER,
  type BriefGenerationSource,
} from "@/types/brief-generation";
import type { BriefSessionContext } from "@/lib/brief-audience-views";
import type { BriefApiSuccessResponse } from "@/types/brief-api";
import { BRIEF_IDEMPOTENCY_KEY_HEADER } from "@/types/brief-api";
import { readBriefApiError } from "@/lib/read-brief-api-error";
import {
  isCounsellingCallNextStep,
  needsClass12Stream,
  needsCompletionYear,
  validateLeadIntake,
  validateStep,
} from "@/lib/validate-lead-intake";
import {
  APPLICATION_STATUSES,
  CLASS_12_STREAMS,
  EDUCATION_STAGES,
  GUARDIAN_DISCUSSION,
  LANGUAGES,
  MAIN_CONCERNS,
  PREFERRED_NEXT_STEPS,
  PREFERRED_STUDY_AREAS,
  type ApplicationStatus,
  type Class12Stream,
  type DecisionBriefResult,
  type EducationStage,
  type FormStepId,
  type GuardianDiscussion,
  type LeadIntakeFormData,
  type MainConcern,
  type PreferredLanguage,
  type PreferredNextStep,
  type PreferredStudyArea,
} from "@/types/lead";

type LeadIntakeFormProps = {
  onSuccess: (
    result: DecisionBriefResult,
    meta: {
      briefSource?: BriefGenerationSource;
      session: BriefSessionContext;
    },
  ) => void;
  onViewResults?: () => void;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20";

const defaultForm: LeadIntakeFormData = {
  studentName: "",
  educationStage: "Currently in Class 12",
  educationStageOther: "",
  class12Stream: "PCM",
  class12StreamOther: "",
  completionYear: "",
  stateCity: "",
  preferredStudyArea: "Undecided",
  mainConcern: "Fees",
  mainConcernOther: "",
  guardianDiscussion: "Planning to",
  applicationStatus: "Not applied",
  preferredNextStep: "Receive information",
  phoneNumber: "",
  additionalQuestions: "",
  preferredLanguage: "English",
  financialContextOptional: "",
  consent: false,
  counsellingContactConsent: false,
};

export function LeadIntakeForm({
  onSuccess,
  onViewResults,
}: LeadIntakeFormProps) {
  const formId = useId();
  const [form, setForm] = useState<LeadIntakeFormData>(defaultForm);
  const [step, setStep] = useState<FormStepId>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefReady, setBriefReady] = useState(false);
  const submitInFlight = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  function updateField<K extends keyof LeadIntakeFormData>(
    key: K,
    value: LeadIntakeFormData[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "educationStage") {
        const stage = value as EducationStage;
        if (!needsClass12Stream(stage)) {
          next.class12Stream = "";
          next.class12StreamOther = "";
        } else if (!next.class12Stream) {
          next.class12Stream = "PCM";
        }
        if (!needsCompletionYear(stage)) {
          next.completionYear = "";
        }
      }
      if (
        key === "preferredNextStep" &&
        !isCounsellingCallNextStep(value as PreferredNextStep)
      ) {
        next.counsellingContactConsent = false;
      }
      return next;
    });
    setError(null);
  }

  function goNext() {
    const stepError = validateStep(step, form);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStep((s) => (s < 3 ? ((s + 1) as FormStepId) : s));
  }

  function goBack() {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as FormStepId) : s));
  }

  const counsellingCallSelected = isCounsellingCallNextStep(
    form.preferredNextStep,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitInFlight.current || isLoading) {
      return;
    }
    const fullFormError = validateLeadIntake(form);
    if (fullFormError) {
      setError(fullFormError);
      return;
    }
    const stepError = validateStep(3, form);
    if (stepError) {
      setError(stepError);
      return;
    }

    submitInFlight.current = true;
    setIsLoading(true);
    setError(null);
    setBriefReady(false);
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [BRIEF_IDEMPOTENCY_KEY_HEADER]: idempotencyKeyRef.current,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(await readBriefApiError(response));
      }

      const payload = (await response.json()) as BriefApiSuccessResponse;
      const sourceHeader = response.headers.get(BRIEF_SOURCE_HEADER);
      const briefSource =
        sourceHeader === "gemini" || sourceHeader === "mock-development"
          ? sourceHeader
          : undefined;
      setBriefReady(true);
      onSuccess(payload.brief, {
        briefSource,
        session: {
          leadReferenceId: payload.leadReferenceId,
          requestId: payload.requestId,
          persistence: payload.persistence,
          lead: { ...form },
          brief: payload.brief,
          n8nFollowUp: payload.n8nFollowUp ?? null,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit. Please try again.",
      );
    } finally {
      submitInFlight.current = false;
      setIsLoading(false);
    }
  }

  const showStream = needsClass12Stream(form.educationStage);
  const showYear = needsCompletionYear(form.educationStage);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby={`${formId}-title`}
      noValidate
    >
      <div>
        <h2 id={`${formId}-title`} className="text-xl font-semibold text-navy">
          Lead intake
        </h2>
        <p className="mt-1 text-sm text-navy-muted">
          A short, three-step conversation to understand your situation. Use
          fictional test data only — no phone number required.
        </p>
      </div>

      <FormProgress currentStep={step} />

      {step === 1 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-name`}
              className="block text-sm font-medium text-navy"
            >
              First name <span className="text-navy-muted">(optional)</span>
            </label>
            <input
              id={`${formId}-name`}
              name="studentName"
              type="text"
              autoComplete="off"
              placeholder="e.g. Test Student Aarav"
              className={fieldClass}
              value={form.studentName}
              onChange={(e) => updateField("studentName", e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-stage`}
              className="block text-sm font-medium text-navy"
            >
              Education stage
            </label>
            <select
              id={`${formId}-stage`}
              name="educationStage"
              required
              className={fieldClass}
              value={form.educationStage}
              onChange={(e) =>
                updateField("educationStage", e.target.value as EducationStage)
              }
            >
              {EDUCATION_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          {form.educationStage === "Other" ? (
            <div className="sm:col-span-2">
              <label
                htmlFor={`${formId}-stage-other`}
                className="block text-sm font-medium text-navy"
              >
                Describe your education stage
              </label>
              <input
                id={`${formId}-stage-other`}
                name="educationStageOther"
                type="text"
                required
                placeholder="e.g. Diploma year 2, gap year after Class 12…"
                className={fieldClass}
                value={form.educationStageOther}
                onChange={(e) =>
                  updateField("educationStageOther", e.target.value)
                }
              />
            </div>
          ) : null}

          {showStream ? (
            <>
              <div>
                <label
                  htmlFor={`${formId}-stream`}
                  className="block text-sm font-medium text-navy"
                >
                  Class 12 stream
                </label>
                <select
                  id={`${formId}-stream`}
                  name="class12Stream"
                  required
                  className={fieldClass}
                  value={form.class12Stream}
                  onChange={(e) =>
                    updateField(
                      "class12Stream",
                      e.target.value as Class12Stream,
                    )
                  }
                >
                  {CLASS_12_STREAMS.map((stream) => (
                    <option key={stream} value={stream}>
                      {stream}
                    </option>
                  ))}
                </select>
              </div>
              {form.class12Stream === "Other" ? (
                <div>
                  <label
                    htmlFor={`${formId}-stream-other`}
                    className="block text-sm font-medium text-navy"
                  >
                    Stream details
                  </label>
                  <input
                    id={`${formId}-stream-other`}
                    name="class12StreamOther"
                    type="text"
                    required
                    placeholder="e.g. PCM with Computer Science"
                    className={fieldClass}
                    value={form.class12StreamOther}
                    onChange={(e) =>
                      updateField("class12StreamOther", e.target.value)
                    }
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {showYear ? (
            <div className={showStream && form.class12Stream !== "Other" ? "sm:col-span-2" : ""}>
              <label
                htmlFor={`${formId}-year`}
                className="block text-sm font-medium text-navy"
              >
                {form.educationStage === "Currently in Class 12"
                  ? "Expected Class 12 completion year"
                  : "Class 12 completion year"}
              </label>
              <input
                id={`${formId}-year`}
                name="completionYear"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                required
                placeholder="e.g. 2026"
                className={fieldClass}
                value={form.completionYear}
                onChange={(e) => updateField("completionYear", e.target.value)}
              />
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-location`}
              className="block text-sm font-medium text-navy"
            >
              State / city
            </label>
            <input
              id={`${formId}-location`}
              name="stateCity"
              type="text"
              required
              autoComplete="address-level2"
              placeholder="e.g. Telangana, Hyderabad"
              className={fieldClass}
              value={form.stateCity}
              onChange={(e) => updateField("stateCity", e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-study-area`}
              className="block text-sm font-medium text-navy"
            >
              Preferred study area
            </label>
            <select
              id={`${formId}-study-area`}
              name="preferredStudyArea"
              required
              className={fieldClass}
              value={form.preferredStudyArea}
              onChange={(e) =>
                updateField(
                  "preferredStudyArea",
                  e.target.value as PreferredStudyArea,
                )
              }
            >
              {PREFERRED_STUDY_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-concern`}
              className="block text-sm font-medium text-navy"
            >
              Main concern right now
            </label>
            <select
              id={`${formId}-concern`}
              name="mainConcern"
              required
              className={fieldClass}
              value={form.mainConcern}
              onChange={(e) =>
                updateField("mainConcern", e.target.value as MainConcern)
              }
            >
              {MAIN_CONCERNS.map((concern) => (
                <option key={concern} value={concern}>
                  {concern}
                </option>
              ))}
            </select>
          </div>

          {form.mainConcern === "Other" ? (
            <div className="sm:col-span-2">
              <label
                htmlFor={`${formId}-concern-other`}
                className="block text-sm font-medium text-navy"
              >
                Describe your concern
              </label>
              <input
                id={`${formId}-concern-other`}
                name="mainConcernOther"
                type="text"
                required
                className={fieldClass}
                value={form.mainConcernOther}
                onChange={(e) =>
                  updateField("mainConcernOther", e.target.value)
                }
              />
            </div>
          ) : null}

          <div>
            <label
              htmlFor={`${formId}-guardian`}
              className="block text-sm font-medium text-navy"
            >
              Discussed NIAT with parent / guardian?
            </label>
            <select
              id={`${formId}-guardian`}
              name="guardianDiscussion"
              required
              className={fieldClass}
              value={form.guardianDiscussion}
              onChange={(e) =>
                updateField(
                  "guardianDiscussion",
                  e.target.value as GuardianDiscussion,
                )
              }
            >
              {GUARDIAN_DISCUSSION.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${formId}-status`}
              className="block text-sm font-medium text-navy"
            >
              Application / counselling status
            </label>
            <select
              id={`${formId}-status`}
              name="applicationStatus"
              required
              className={fieldClass}
              value={form.applicationStatus}
              onChange={(e) =>
                updateField(
                  "applicationStatus",
                  e.target.value as ApplicationStatus,
                )
              }
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-financial`}
              className="block text-sm font-medium text-navy"
            >
              Affordability context{" "}
              <span className="text-navy-muted">(optional)</span>
            </label>
            <textarea
              id={`${formId}-financial`}
              name="financialContextOptional"
              rows={2}
              placeholder="e.g. exploring EMI options — no bank or ID details"
              className={`${fieldClass} resize-y`}
              value={form.financialContextOptional}
              onChange={(e) =>
                updateField("financialContextOptional", e.target.value)
              }
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-next`}
              className="block text-sm font-medium text-navy"
            >
              Preferred next step
            </label>
            <select
              id={`${formId}-next`}
              name="preferredNextStep"
              required
              className={fieldClass}
              value={form.preferredNextStep}
              onChange={(e) =>
                updateField(
                  "preferredNextStep",
                  e.target.value as PreferredNextStep,
                )
              }
            >
              {PREFERRED_NEXT_STEPS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-phone`}
              className="block text-sm font-medium text-navy"
            >
              Phone number{" "}
              {counsellingCallSelected ? (
                <span className="text-navy">(Required for counselling call)</span>
              ) : (
                <span className="text-navy-muted">(optional)</span>
              )}
            </label>
            <input
              id={`${formId}-phone`}
              name="phoneNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required={counsellingCallSelected}
              placeholder="e.g. 9876543210"
              className={fieldClass}
              value={form.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-navy-muted">
              Used only to follow up on a counselling call request. Not sent to
              the AI brief generator.
            </p>
          </div>

          {counsellingCallSelected ? (
            <div className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-border bg-white p-4">
              <input
                id={`${formId}-counselling-consent`}
                name="counsellingContactConsent"
                type="checkbox"
                required
                className="mt-1 size-4 rounded border-border text-teal focus:ring-teal"
                checked={form.counsellingContactConsent}
                onChange={(e) =>
                  updateField("counsellingContactConsent", e.target.checked)
                }
              />
              <label
                htmlFor={`${formId}-counselling-consent`}
                className="text-sm text-navy-muted"
              >
                I consent to be contacted by phone about scheduling a counselling
                call related to this request. Submitting this form does not book
                or guarantee a call.{" "}
                <span className="text-navy">(Required for this next step)</span>
              </label>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-questions`}
              className="block text-sm font-medium text-navy"
            >
              Additional questions{" "}
              <span className="text-navy-muted">(optional)</span>
            </label>
            <textarea
              id={`${formId}-questions`}
              name="additionalQuestions"
              rows={4}
              placeholder="Anything else you want clarity on before deciding…"
              className={`${fieldClass} resize-y`}
              value={form.additionalQuestions}
              onChange={(e) =>
                updateField("additionalQuestions", e.target.value)
              }
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor={`${formId}-language`}
              className="block text-sm font-medium text-navy"
            >
              Preferred language
            </label>
            <select
              id={`${formId}-language`}
              name="preferredLanguage"
              required
              className={fieldClass}
              value={form.preferredLanguage}
              onChange={(e) =>
                updateField(
                  "preferredLanguage",
                  e.target.value as PreferredLanguage,
                )
              }
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex items-start gap-3 rounded-lg bg-surface p-4">
            <input
              id={`${formId}-consent`}
              name="consent"
              type="checkbox"
              required
              className="mt-1 size-4 rounded border-border text-teal focus:ring-teal"
              checked={form.consent}
              onChange={(e) => updateField("consent", e.target.checked)}
            />
            <label
              htmlFor={`${formId}-consent`}
              className="text-sm text-navy-muted"
            >
              I consent to ClearPath NIAT processing the information I submit
              to generate my decision brief.{" "}
              <span className="text-navy">(Required)</span>
            </label>
          </div>
        </div>
      ) : null}

      {briefReady ? (
        <div
          role="status"
          className="rounded-lg border border-teal/30 bg-teal/5 px-4 py-3 text-sm text-navy"
        >
          <p className="font-medium">Your decision brief is ready.</p>
          <p className="mt-1 text-navy-muted">
            Review it below — programme details may still need counsellor
            confirmation.
          </p>
          {onViewResults ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={onViewResults}
            >
              View decision brief
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-navy-muted"
        >
          Preparing your decision brief… This can take up to a minute while we
          generate a grounded response. Please keep this tab open.
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 1 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={goBack}
            disabled={isLoading}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button type="button" onClick={goNext} className="sm:ml-auto">
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            isLoading={isLoading}
            className="sm:ml-auto"
          >
            Create decision brief
          </Button>
        )}
      </div>
    </form>
  );
}
