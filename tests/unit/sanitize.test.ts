import { describe, it, expect, vi } from "vitest";
import { sanitizeString, safeLogger } from "@/lib/security/sanitize";

describe("Sanitization & PII Security Unit Tests", () => {
  it("should strip non-printable control characters from input", () => {
    const dirty = "Alex\u0000\u0007 Morgan\u001F";
    const cleaned = sanitizeString(dirty);
    expect(cleaned).toBe("Alex Morgan");
  });

  it("should ensure safeLogger never logs PII", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    safeLogger.info("TEST_EVENT", {
      formId: "form-123",
      workspaceId: "ws-456",
      idempotencyKey: "idem-789",
      submissionId: "sub-999",
      durationMs: 45,
      status: "submitted",
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0]);

    // Check that only non-PII metadata was logged
    expect(loggedJson).toHaveProperty("level", "INFO");
    expect(loggedJson).toHaveProperty("event", "TEST_EVENT");
    expect(loggedJson).toHaveProperty("formId", "form-123");
    expect(loggedJson).not.toHaveProperty("name");
    expect(loggedJson).not.toHaveProperty("age");
    expect(loggedJson).not.toHaveProperty("dateOfBirth");
    expect(loggedJson).not.toHaveProperty("address");

    consoleSpy.mockRestore();
  });
});
