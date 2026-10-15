import { BRIEF_REQUEST_ID_HEADER } from "@/types/brief-generation";

export async function readBriefApiError(response: Response): Promise<string> {
  const requestId = response.headers.get(BRIEF_REQUEST_ID_HEADER);
  const ref = requestId ? ` (ref: ${requestId.slice(0, 8)})` : "";

  try {
    const body = (await response.json()) as { error?: string; requestId?: string };
    if (typeof body?.error === "string" && body.error.trim()) {
      return body.error.trim() + ref;
    }
  } catch {
    // HTML or empty error bodies (e.g. broken dev server) — fall through
  }

  if (response.status === 400) {
    return `Please check the form and try again.${ref}`;
  }
  if (response.status === 502 || response.status === 503) {
    return `We could not generate your brief right now. Please try again.${ref}`;
  }
  if (response.status >= 500) {
    return `The server returned an error. Restart the dev server and try again.${ref}`;
  }

  return `Something went wrong. Please try again.${ref}`;
}
