import { NextRequest, NextResponse } from "next/server";
import { userProfileSchema } from "@/lib/validations/user-profile";
import { SubmissionService } from "@/lib/services/submissions";
import { submissionRateLimiter } from "@/lib/security/rate-limit";
import { createSafeMetadata, safeLogger } from "@/lib/security/sanitize";
import { SubmissionPayload } from "@/lib/types/form";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  // 1. Identify client IP / identifier for rate limiting
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const rateLimitKey = `rate:${ip}`;

  // 2. Check Rate Limit (10 requests per 60 seconds per IP)
  const rateCheck = submissionRateLimiter.check(rateLimitKey, {
    windowMs: 60_000,
    maxRequests: 10,
  });

  if (!rateCheck.allowed) {
    safeLogger.warn("RATE_LIMIT_EXCEEDED", {
      reason: "Max requests reached for IP window",
      statusCode: 429,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Too many submission attempts. Please wait before trying again.",
        code: "RATE_LIMIT_EXCEEDED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateCheck.resetTimeMs - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": rateCheck.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json();

    // 3. Extract Idempotency Key from header or body
    const idempotencyKey =
      req.headers.get("x-idempotency-key") ||
      body.idempotency_key ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

    // 4. Server-Side Zod Validation
    const validationResult = userProfileSchema.safeParse(body.data || body);

    if (!validationResult.success) {
      const formattedErrors: Record<string, string[]> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] ? String(issue.path[0]) : "form";
        if (!formattedErrors[fieldName]) {
          formattedErrors[fieldName] = [];
        }
        formattedErrors[fieldName].push(issue.message);
      }

      safeLogger.warn("SERVER_VALIDATION_FAILED", {
        reason: "Zod schema constraints not satisfied",
        statusCode: 400,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Validation failed. Please review the form fields.",
          errors: formattedErrors,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // 5. Build submission payload
    const submissionPayload: SubmissionPayload = {
      workspace_id: body.workspace_id,
      form_id: body.form_id,
      published_version_id: body.published_version_id,
      data: validationResult.data,
      idempotency_key: idempotencyKey,
    };

    // 6. Persist submission via SubmissionService
    const safeMetadata = createSafeMetadata(req.headers);
    const submissionService = new SubmissionService();
    const result = await submissionService.submitForm(submissionPayload, {
      metadata: safeMetadata,
    });

    safeLogger.info("API_SUBMISSION_COMPLETED", {
      formId: submissionPayload.form_id,
      workspaceId: submissionPayload.workspace_id,
      idempotencyKey,
      submissionId: result.submission_id,
      durationMs: Date.now() - startTime,
      status: result.status,
    });

    return NextResponse.json(result, {
      status: 201,
      headers: {
        "X-RateLimit-Limit": rateCheck.limit.toString(),
        "X-RateLimit-Remaining": rateCheck.remaining.toString(),
      },
    });
  } catch (error) {
    safeLogger.error("API_SUBMISSION_INTERNAL_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving your profile. Please try again.",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
