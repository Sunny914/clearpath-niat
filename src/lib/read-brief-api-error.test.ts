import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readBriefApiError } from "@/lib/read-brief-api-error";

describe("readBriefApiError", () => {
  it("returns server error message from JSON", async () => {
    const response = new Response(
      JSON.stringify({ error: "The request took too long. Please try again." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
    const message = await readBriefApiError(response);
    assert.match(message, /took too long/);
  });

  it("handles HTML 500 without JSON", async () => {
    const response = new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
    const message = await readBriefApiError(response);
    assert.match(message, /Restart the dev server/);
  });
});
