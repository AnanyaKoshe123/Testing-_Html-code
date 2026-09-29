"use client";

import React, { useState, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  userProfileSchema,
  UserProfileFormSchemaInput,
  getTodayDateString,
} from "@/lib/validations/user-profile";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Send,
  User,
  Calendar,
  MapPin,
  Sparkles,
} from "lucide-react";
import { SubmissionApiResponse } from "@/lib/types/form";

interface UserProfileFormProps {
  formId?: string;
  workspaceId?: string;
  publishedVersionId?: string;
  onSuccess?: (submissionId: string) => void;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({
  formId = "00000000-0000-0000-0000-000000000002",
  workspaceId = "00000000-0000-0000-0000-000000000001",
  publishedVersionId = "00000000-0000-0000-0000-000000000003",
  onSuccess,
}) => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    submissionId: string;
    idempotencyKey: string;
    submittedAt: string;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  // Unique IDs for accessibility associations
  const nameHelpId = useId();
  const nameErrorId = useId();
  const ageHelpId = useId();
  const ageErrorId = useId();
  const dobHelpId = useId();
  const dobErrorId = useId();
  const addressHelpId = useId();
  const addressErrorId = useId();

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserProfileFormSchemaInput>({
    resolver: zodResolver(userProfileSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      age: "" as unknown as number,
      dateOfBirth: "",
      address: "",
    },
  });

  // Watch field values for character counts
  const watchedName = watch("name") || "";
  const watchedAddress = watch("address") || "";

  const onSubmit = async (data: UserProfileFormSchemaInput) => {
    setServerError(null);

    // Generate unique idempotency key for this submission attempt
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const response = await fetch("/api/submissions", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          form_id: formId,
          workspace_id: workspaceId,
          published_version_id: publishedVersionId,
          data: {
            name: data.name.trim(),
            age: Number(data.age),
            dateOfBirth: data.dateOfBirth,
            address: data.address.trim(),
          },
          idempotency_key: idempotencyKey,
        }),
      });

      const result: SubmissionApiResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage =
          !result.success && result.error
            ? result.error
            : "Failed to submit profile. Please try again.";
        throw new Error(errorMessage);
      }

      // Success State
      setSubmissionSuccess({
        submissionId: result.submission_id,
        idempotencyKey: result.idempotency_key,
        submittedAt: result.created_at,
      });

      if (onSuccess) {
        onSuccess(result.submission_id);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "A network error occurred while submitting. Your entered data has been preserved.";
      setServerError(errorMsg);
    }
  };

  const onInvalidSubmit = () => {
    // Focus first invalid field according to WAI-ARIA best practices
    const fieldOrder: (keyof UserProfileFormSchemaInput)[] = [
      "name",
      "age",
      "dateOfBirth",
      "address",
    ];

    for (const field of fieldOrder) {
      if (errors[field]) {
        setFocus(field);
        break;
      }
    }
  };

  const handleClearClick = () => {
    if (isDirty) {
      setIsClearModalOpen(true);
    } else {
      performClear();
    }
  };

  const performClear = () => {
    reset({
      name: "",
      age: "" as unknown as number,
      dateOfBirth: "",
      address: "",
    });
    setServerError(null);
    setIsClearModalOpen(false);
  };

  const handleStartNewSubmission = () => {
    setSubmissionSuccess(null);
    reset({
      name: "",
      age: "" as unknown as number,
      dateOfBirth: "",
      address: "",
    });
    setServerError(null);
  };

  return (
    <div className="w-full">
      {/* SUCCESS STATE */}
      {submissionSuccess ? (
        <div
          role="status"
          aria-live="polite"
          className="bg-white rounded-3xl p-8 md:p-10 shadow-card border border-emerald-100 text-center animate-fadeIn"
        >
          <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Submission Confirmed
          </span>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Profile Saved Successfully!
          </h2>
          <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm sm:text-base leading-relaxed">
            Your user profile information has been securely stored in FormForge AI.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 max-w-md mx-auto mb-8 border border-slate-200 text-left text-xs sm:text-sm text-slate-600 space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Submission Reference:</span>
              <span className="font-mono text-slate-900 font-semibold truncate max-w-[200px]" title={submissionSuccess.submissionId}>
                {submissionSuccess.submissionId}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Status:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Verified & Stored
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartNewSubmission}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/25 min-h-[48px]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Submit Another Profile
          </button>
        </div>
      ) : (
        /* FORM CARD */
        <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-card border border-slate-100">
          <div className="border-b border-slate-100 pb-6 mb-8">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              FormForge AI Standard Form
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Basic User Profile
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Please enter your personal details below. All fields marked with an asterisk (<span className="text-red-500 font-bold" aria-hidden="true">*</span>) are required.
            </p>
          </div>

          {/* SERVER / NETWORK ERROR BANNER */}
          {serverError && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-red-900">Submission Unsuccessful</p>
                <p className="mt-0.5 text-red-700 leading-relaxed">{serverError}</p>
                <p className="mt-1 text-xs text-red-600 font-medium">Your entered details have been retained.</p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
            noValidate
            className="space-y-6"
          >
            {/* FIELD 1: NAME */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Full Name <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                </label>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  {watchedName.length}/100
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" aria-hidden="true" />
                </div>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={`${nameHelpId} ${errors.name ? nameErrorId : ""}`}
                  placeholder="e.g. Alex Morgan"
                  {...register("name")}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50/70 text-slate-900 rounded-xl border text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                    errors.name
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                      : "border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-500/20"
                  } min-h-[48px]`}
                />
              </div>
              <p id={nameHelpId} className="mt-1.5 text-xs text-slate-500">
                Minimum 2 characters, maximum 100 characters.
              </p>
              {errors.name && (
                <p
                  id={nameErrorId}
                  role="alert"
                  className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* FIELD 2: AGE */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="age"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Age <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                </label>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  0 - 150 yrs
                </span>
              </div>
              <input
                id="age"
                type="number"
                min="0"
                max="150"
                step="1"
                aria-required="true"
                aria-invalid={!!errors.age}
                aria-describedby={`${ageHelpId} ${errors.age ? ageErrorId : ""}`}
                placeholder="e.g. 28"
                {...register("age")}
                className={`w-full px-4 py-3 bg-slate-50/70 text-slate-900 rounded-xl border text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                  errors.age
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                    : "border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-500/20"
                } min-h-[48px]`}
              />
              <p id={ageHelpId} className="mt-1.5 text-xs text-slate-500">
                Enter your age in whole years (0 to 150).
              </p>
              {errors.age && (
                <p
                  id={ageErrorId}
                  role="alert"
                  className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {errors.age.message}
                </p>
              )}
            </div>

            {/* FIELD 3: DATE OF BIRTH */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="dateOfBirth"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Date of Birth <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                </label>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  YYYY-MM-DD
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-5 h-5" aria-hidden="true" />
                </div>
                <input
                  id="dateOfBirth"
                  type="date"
                  max={todayStr}
                  aria-required="true"
                  aria-invalid={!!errors.dateOfBirth}
                  aria-describedby={`${dobHelpId} ${errors.dateOfBirth ? dobErrorId : ""}`}
                  {...register("dateOfBirth")}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50/70 text-slate-900 rounded-xl border text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 ${
                    errors.dateOfBirth
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                      : "border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-500/20"
                  } min-h-[48px]`}
                />
              </div>
              <p id={dobHelpId} className="mt-1.5 text-xs text-slate-500">
                Cannot be a future date.
              </p>
              {errors.dateOfBirth && (
                <p
                  id={dobErrorId}
                  role="alert"
                  className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>

            {/* FIELD 4: ADDRESS */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="address"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Residential Address <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                </label>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  {watchedAddress.length}/500
                </span>
              </div>
              <div className="relative">
                <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-400">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </div>
                <textarea
                  id="address"
                  rows={4}
                  aria-required="true"
                  aria-invalid={!!errors.address}
                  aria-describedby={`${addressHelpId} ${errors.address ? addressErrorId : ""}`}
                  placeholder="Enter your street address, apartment, city, and postal code..."
                  {...register("address")}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50/70 text-slate-900 rounded-xl border text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 resize-y ${
                    errors.address
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                      : "border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-500/20"
                  } min-h-[100px]`}
                />
              </div>
              <p id={addressHelpId} className="mt-1.5 text-xs text-slate-500">
                Minimum 5 characters, maximum 500 characters.
              </p>
              {errors.address && (
                <p
                  id={addressErrorId}
                  role="alert"
                  className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1 animate-fadeIn"
                >
                  <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              {/* CLEAR BUTTON */}
              <button
                type="button"
                onClick={handleClearClick}
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50/80 active:bg-blue-100/80 font-semibold rounded-xl transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:pointer-events-none min-h-[48px]"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Clear Form
              </button>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-75 disabled:cursor-not-allowed min-h-[48px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>Submit Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR CLEAR ACTION */}
      <ConfirmationDialog
        isOpen={isClearModalOpen}
        title="Clear Form Details?"
        description="You have entered information that has not been saved yet. Clearing will discard all field entries and cannot be undone."
        confirmLabel="Yes, Clear All"
        cancelLabel="Keep Editing"
        onConfirm={performClear}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
