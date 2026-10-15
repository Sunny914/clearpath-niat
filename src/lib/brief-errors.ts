import type { BriefGenerationErrorCode } from "@/lib/generate-gemini-brief";

export function isBriefGenerationError(
  error: unknown,
): error is { code: BriefGenerationErrorCode; message: string } {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  return (
    record.name === "BriefGenerationError" &&
    typeof record.code === "string" &&
    typeof record.message === "string"
  );
}
