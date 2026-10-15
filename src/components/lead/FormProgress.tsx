import { FORM_STEPS, type FormStepId } from "@/types/lead";

type FormProgressProps = {
  currentStep: FormStepId;
};

export function FormProgress({ currentStep }: FormProgressProps) {
  return (
    <nav aria-label="Form progress">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {FORM_STEPS.map((step, index) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <li
              key={step.id}
              className="flex flex-1 items-center gap-3 sm:flex-col sm:items-stretch sm:text-center"
            >
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isComplete || isCurrent
                      ? "bg-teal text-white"
                      : "border border-border bg-white text-navy-muted"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? "✓" : step.id}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isCurrent ? "text-navy" : "text-navy-muted"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < FORM_STEPS.length - 1 ? (
                <div
                  className="hidden h-px flex-1 bg-border sm:block"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
