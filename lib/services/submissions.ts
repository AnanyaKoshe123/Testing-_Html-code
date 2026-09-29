import { SupabaseClient } from "@supabase/supabase-js";
import {
  SubmissionPayload,
  FormSubmissionRecord,
  SubmissionSuccessResponse,
  SafeMetadata,
} from "../types/form";
import { getSupabaseServerClient } from "../supabase/server";
import { safeLogger } from "../security/sanitize";

export interface InsertSubmissionOptions {
  supabaseClient?: SupabaseClient;
  metadata?: SafeMetadata;
}

export class SubmissionService {
  private client: SupabaseClient;

  constructor(customClient?: SupabaseClient) {
    this.client = customClient || getSupabaseServerClient();
  }

  /**
   * Persists a form submission to the Supabase PostgreSQL `form_submissions` table.
   * Handles idempotency keys to ensure at-most-once submission.
   */
  public async submitForm(
    payload: SubmissionPayload,
    options?: { metadata?: SafeMetadata }
  ): Promise<SubmissionSuccessResponse> {
    const startTime = Date.now();
    const workspaceId =
      payload.workspace_id ||
      process.env.DEFAULT_WORKSPACE_ID ||
      "00000000-0000-0000-0000-000000000001";
    const formId =
      payload.form_id ||
      process.env.DEFAULT_FORM_ID ||
      "00000000-0000-0000-0000-000000000002";
    const publishedVersionId =
      payload.published_version_id ||
      process.env.DEFAULT_VERSION_ID ||
      null;

    const safeMetadata: SafeMetadata = options?.metadata || {
      submitted_at: new Date().toISOString(),
      user_agent_category: "web",
      client_timestamp: new Date().toISOString(),
    };

    // 1. Idempotency Check: Check if a submission with this idempotency key already exists
    if (payload.idempotency_key) {
      try {
        const { data: existingRecord, error: checkError } = await this.client
          .from("form_submissions")
          .select("id, status, idempotency_key, created_at")
          .eq("form_id", formId)
          .eq("idempotency_key", payload.idempotency_key)
          .maybeSingle();

        if (!checkError && existingRecord) {
          safeLogger.info("IDEMPOTENT_SUBMISSION_REPLAYED", {
            formId,
            workspaceId,
            idempotencyKey: payload.idempotency_key,
            submissionId: existingRecord.id,
            durationMs: Date.now() - startTime,
            status: existingRecord.status,
          });

          return {
            success: true,
            submission_id: existingRecord.id,
            status: existingRecord.status,
            idempotency_key: existingRecord.idempotency_key,
            message: "Form submission already processed successfully.",
            created_at: existingRecord.created_at,
          };
        }
      } catch (err) {
        // If checking fails due to mock/network issues, continue with insert attempt
        safeLogger.warn("IDEMPOTENCY_CHECK_BYPASS", {
          formId,
          workspaceId,
          reason: "Table lookup bypassed or not yet created",
        });
      }
    }

    // 2. Insert the submission into `form_submissions` table
    const rowToInsert = {
      workspace_id: workspaceId,
      form_id: formId,
      published_version_id: publishedVersionId,
      status: "submitted",
      data: payload.data,
      metadata: safeMetadata,
      idempotency_key: payload.idempotency_key,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const isMockUrl =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock-formforge");

    // In local development with mock URL, simulate successful persistence
    if (isMockUrl) {
      const mockSubmissionId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `mock_sub_${Date.now()}`;

      safeLogger.info("MOCK_SUBMISSION_PERSISTED", {
        formId,
        workspaceId,
        idempotencyKey: payload.idempotency_key,
        submissionId: mockSubmissionId,
        durationMs: Date.now() - startTime,
        status: "submitted",
      });

      return {
        success: true,
        submission_id: mockSubmissionId,
        status: "submitted",
        idempotency_key: payload.idempotency_key,
        message: "Profile submitted successfully (Development Mock Mode)!",
        created_at: new Date().toISOString(),
      };
    }

    const { data: insertedData, error: insertError } = await this.client
      .from("form_submissions")
      .insert(rowToInsert)
      .select("id, status, idempotency_key, created_at")
      .single();

    if (insertError) {
      // Check for unique constraint violation on idempotency_key
      if (insertError.code === "23505" && payload.idempotency_key) {
        const { data: fallbackRecord } = await this.client
          .from("form_submissions")
          .select("id, status, idempotency_key, created_at")
          .eq("form_id", formId)
          .eq("idempotency_key", payload.idempotency_key)
          .single();

        if (fallbackRecord) {
          return {
            success: true,
            submission_id: fallbackRecord.id,
            status: fallbackRecord.status,
            idempotency_key: fallbackRecord.idempotency_key,
            message: "Form submission recorded successfully.",
            created_at: fallbackRecord.created_at,
          };
        }
      }

      safeLogger.error("SUBMISSION_DB_INSERT_FAILED", insertError, {
        formId,
        workspaceId,
        idempotencyKey: payload.idempotency_key,
        errorCode: insertError.code,
      });

      throw new Error(`Database error: ${insertError.message || "Failed to persist submission"}`);
    }

    const createdRecord = insertedData as Pick<
      FormSubmissionRecord,
      "id" | "status" | "idempotency_key" | "created_at"
    >;

    safeLogger.info("SUBMISSION_PERSISTED_SUCCESSFULLY", {
      formId,
      workspaceId,
      idempotencyKey: payload.idempotency_key,
      submissionId: createdRecord.id,
      durationMs: Date.now() - startTime,
      status: createdRecord.status,
    });

    return {
      success: true,
      submission_id: createdRecord.id,
      status: createdRecord.status,
      idempotency_key: createdRecord.idempotency_key,
      message: "Profile submitted successfully!",
      created_at: createdRecord.created_at,
    };
  }
}
