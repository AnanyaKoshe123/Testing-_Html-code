import { z } from "zod";

/**
 * Returns today's date string in YYYY-MM-DD format based on the client/server timezone.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a YYYY-MM-DD date string represents a valid calendar date
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Comprehensive Zod schema for the Basic User Profile Form
 */
export const userProfileSchema = z.object({
  name: z
    .string({
      required_error: "Full name is required",
      invalid_type_error: "Name must be text",
    })
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(2, { message: "Name must be at least 2 characters" })
        .max(100, { message: "Name cannot exceed 100 characters" })
    ),

  age: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) {
        return undefined;
      }
      const parsed = Number(val);
      return isNaN(parsed) ? val : parsed;
    },
    z
      .number({
        required_error: "Age is required",
        invalid_type_error: "Age must be a valid number",
      })
      .int({ message: "Age must be a whole integer" })
      .min(0, { message: "Age cannot be negative (minimum 0)" })
      .max(150, { message: "Age cannot exceed 150" })
  ),

  dateOfBirth: z
    .string({
      required_error: "Date of birth is required",
      invalid_type_error: "Date of birth must be a date string",
    })
    .min(1, { message: "Date of birth is required" })
    .refine(
      (val) => isValidCalendarDate(val),
      { message: "Please enter a valid calendar date (YYYY-MM-DD)" }
    )
    .refine(
      (val) => {
        const todayStr = getTodayDateString();
        return val <= todayStr;
      },
      { message: "Date of birth cannot be in the future" }
    ),

  address: z
    .string({
      required_error: "Address is required",
      invalid_type_error: "Address must be text",
    })
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(5, { message: "Address must be at least 5 characters" })
        .max(500, { message: "Address cannot exceed 500 characters" })
    ),
});

/**
 * Inferred TypeScript input and output types
 */
export type UserProfileFormSchemaInput = z.input<typeof userProfileSchema>;
export type UserProfileFormSchemaOutput = z.output<typeof userProfileSchema>;
