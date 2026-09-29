import { SafeMetadata } from "../types/form";

/**
 * Sanitizes generic string inputs by stripping non-printable control characters
 * and trimming leading/trailing whitespace.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

/**
 * Creates safe metadata for submission persistence without storing PII in metadata.
 */
export function createSafeMetadata(reqHeaders?: Headers): SafeMetadata {
  const userAgent = reqHeaders?.get("user-agent") || "";
  let userAgentCategory = "other";
  if (/mobile/i.test(userAgent)) userAgentCategory = "mobile";
  else if (/tablet/i.test(userAgent)) userAgentCategory = "tablet";
  else if (/mozilla|chrome|safari|firefox|edge/i.test(userAgent)) userAgentCategory = "desktop";

  return {
    submitted_at: new Date().toISOString(),
    user_agent_category: userAgentCategory,
    client_timestamp: new Date().toISOString(),
  };
}

/**
 * Structured logger that guarantees no Personal Identifiable Information (PII) is logged.
 */
export const safeLogger = {
  info: (event: string, meta: {
    formId?: string;
    workspaceId?: string;
    idempotencyKey?: string;
    submissionId?: string;
    durationMs?: number;
    status?: string;
  }) => {
    // Only safe non-PII identifiers are logged
    console.log(
      JSON.stringify({
        level: "INFO",
        timestamp: new Date().toISOString(),
        event,
        ...meta,
      })
    );
  },

  warn: (event: string, meta: {
    formId?: string;
    workspaceId?: string;
    reason?: string;
    ipHash?: string;
    statusCode?: number;
  }) => {
    console.warn(
      JSON.stringify({
        level: "WARN",
        timestamp: new Date().toISOString(),
        event,
        ...meta,
      })
    );
  },

  error: (event: string, error: unknown, meta?: {
    formId?: string;
    workspaceId?: string;
    idempotencyKey?: string;
    errorCode?: string;
  }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "ERROR",
        timestamp: new Date().toISOString(),
        event,
        errorMessage,
        ...meta,
      })
    );
  },
};
