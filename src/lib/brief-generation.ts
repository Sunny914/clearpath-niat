import { generateGeminiBrief, BriefGenerationError } from "@/lib/generate-gemini-brief";
import { generateMockBrief } from "@/lib/generate-mock-brief";
import type { BriefTimingCollector } from "@/lib/brief-timing";
import type { BriefGenerationSource } from "@/types/brief-generation";
import type { DecisionBriefResult, LeadIntakeFormData } from "@/types/lead";

export type { BriefGenerationSource } from "@/types/brief-generation";
export { BRIEF_SOURCE_HEADER } from "@/types/brief-generation";

function isMockBriefForced(): boolean {
  const flag = process.env.USE_MOCK_BRIEF?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export type CreateBriefResult = {
  result: DecisionBriefResult;
  source: BriefGenerationSource;
};

export type CreateDecisionBriefOptions = {
  timing?: BriefTimingCollector;
};

export async function createDecisionBrief(
  lead: LeadIntakeFormData,
  options?: CreateDecisionBriefOptions,
): Promise<CreateBriefResult> {
  if (isMockBriefForced()) {
    return {
      result: generateMockBrief(lead, { developmentMock: true }),
      source: "mock-development",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new BriefGenerationError(
        "missing_api_key",
        "Brief generation is not configured.",
      );
    }
    return {
      result: generateMockBrief(lead, { developmentMock: true }),
      source: "mock-development",
    };
  }

  const result = await generateGeminiBrief(lead, apiKey, {
    timing: options?.timing,
  });

  return { result, source: "gemini" };
}

export { BriefGenerationError };
