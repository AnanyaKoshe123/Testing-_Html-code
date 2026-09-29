export interface UserProfileFormData {
  name: string;
  age: number | "";
  dateOfBirth: string;
  address: string;
}

export interface UserProfileValidatedData {
  name: string;
  age: number;
  dateOfBirth: string;
  address: string;
}

export interface SubmissionPayload {
  workspace_id?: string;
  form_id?: string;
  published_version_id?: string;
  data: UserProfileValidatedData;
  idempotency_key: string;
}

export interface SafeMetadata {
  submitted_at: string;
  ip_hash?: string;
  user_agent_category?: string;
  client_timestamp?: string;
}

export interface FormSubmissionRecord {
  id: string;
  workspace_id: string;
  form_id: string;
  published_version_id: string | null;
  status: "submitted" | "processing" | "completed" | "flagged";
  data: UserProfileValidatedData;
  metadata: SafeMetadata;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionSuccessResponse {
  success: true;
  submission_id: string;
  status: string;
  idempotency_key: string;
  message: string;
  created_at: string;
}

export interface SubmissionErrorResponse {
  success: false;
  error: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export type SubmissionApiResponse =
  | SubmissionSuccessResponse
  | SubmissionErrorResponse;
