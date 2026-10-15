/**
 * Safe local probe: uses .env.local, prints HTTP status and workflow status only.
 * Usage: node scripts/probe-n8n-webhook.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("probe_result: missing_env_local");
  process.exit(1);
}

for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const url = process.env.N8N_WEBHOOK_URL?.trim();
const secret = process.env.N8N_WEBHOOK_SECRET?.trim();

if (!url || !secret) {
  console.log("probe_result: n8n_env_incomplete");
  process.exit(1);
}

console.log("url_uses_webhook_test:", /webhook-test/.test(url));
console.log("url_uses_production_path:", /\/webhook\/clearpath-lead\/?$/.test(url));

const leadId = randomUUID();
const requestId = randomUUID();
const body = {
  eventType: "lead_persisted",
  persistence: "saved",
  leadId,
  requestId,
  preferredNextStep: "Receive information",
  applicationStatus: "Not applied",
  counsellingContactConsent: false,
  brief: {
    statedConcernCategory: "Fees",
    recommendedNextAction: "Review official fee materials.",
    recommendedNextActionRationale: "Synthetic probe only.",
  },
};

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-clearpath-secret": secret,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let workflowStatus = null;
  try {
    const json = JSON.parse(text);
    workflowStatus = json.status ?? json.response?.status ?? null;
  } catch {
    /* non-json */
  }
  console.log("http_status:", res.status);
  console.log("workflow_status:", workflowStatus ?? "non_json_or_error");
  if (res.status === 404) {
    console.log("hint: activate workflow ClearPath NIAT - Lead Follow-up in n8n");
  }
  if (res.status === 403) {
    console.log("hint: n8n Header Auth credential must match N8N_WEBHOOK_SECRET");
  }
} catch (err) {
  console.log("probe_result: network_error");
  console.log("error_name:", err instanceof Error ? err.name : "unknown");
}
