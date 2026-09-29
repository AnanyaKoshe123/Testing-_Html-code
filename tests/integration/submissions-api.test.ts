import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/submissions/route";
import { NextRequest } from "next/server";
import { submissionRateLimiter } from "@/lib/security/rate-limit";

// Mock SubmissionService
vi.mock("@/lib/services/submissions", () => {
  return {
    SubmissionService: vi.fn().mockImplementation(() => ({
      submitForm: vi.fn().mockImplementation(async (payload) => {
        return {
          success: true,
          submission_id: "mock-sub-uuid-12345",
          status: "submitted",
          idempotency_key: payload.idempotency_key || "test-idempotency",
          message: "Profile submitted successfully!",
          created_at: "2026-09-22T12:00:00.000Z",
        };
      }),
    })),
  };
});

describe("Submissions API Route Integration Tests", () => {
  beforeEach(() => {
    submissionRateLimiter.reset();
    vi.clearAllMocks();
  });

  it("should process a valid form submission successfully and return 201", async () => {
    const validBody = {
      workspace_id: "00000000-0000-0000-0000-000000000001",
      form_id: "00000000-0000-0000-0000-000000000002",
      data: {
        name: "Elena Rostova",
        age: 31,
        dateOfBirth: "1995-08-20",
        address: "742 Evergreen Terrace, Springfield",
      },
      idempotency_key: "test-idem-001",
    };

    const req = new NextRequest("http://localhost:3000/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.1",
      },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.submission_id).toBe("mock-sub-uuid-12345");
    expect(json.idempotency_key).toBe("test-idem-001");
  });

  it("should reject invalid data with 400 Bad Request and validation errors", async () => {
    const invalidBody = {
      data: {
        name: "A", // too short (min 2)
        age: -5, // invalid negative age
        dateOfBirth: "2099-01-01", // future date
        address: "Tiny", // too short (min 5)
      },
    };

    const req = new NextRequest("http://localhost:3000/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.2",
      },
      body: JSON.stringify(invalidBody),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(json.errors).toBeDefined();
    expect(json.errors.name).toBeDefined();
    expect(json.errors.age).toBeDefined();
    expect(json.errors.dateOfBirth).toBeDefined();
    expect(json.errors.address).toBeDefined();
  });

  it("should return 429 Too Many Requests when rate limit is exceeded", async () => {
    const testIp = "203.0.113.99";

    const makeRequest = () =>
      new NextRequest("http://localhost:3000/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({
          data: {
            name: "Rate Tester",
            age: 25,
            dateOfBirth: "2000-01-01",
            address: "100 Rate Limit Ave, Server City",
          },
        }),
      });

    // Make 10 permitted requests
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeRequest());
      expect(res.status).toBe(201);
    }

    // 11th request should be blocked
    const rateLimitedRes = await POST(makeRequest());
    const json = await rateLimitedRes.json();

    expect(rateLimitedRes.status).toBe(429);
    expect(json.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(rateLimitedRes.headers.get("Retry-After")).toBeDefined();
  });
});
