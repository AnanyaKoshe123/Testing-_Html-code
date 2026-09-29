import { describe, it, expect } from "vitest";
import {
  userProfileSchema,
  isValidCalendarDate,
  getTodayDateString,
} from "@/lib/validations/user-profile";

describe("UserProfile Zod Schema Validation", () => {
  const validPayload = {
    name: "Jane Doe",
    age: 29,
    dateOfBirth: "1997-04-15",
    address: "123 Innovation Way, Suite 400, Tech City",
  };

  it("should successfully validate a complete, valid payload", () => {
    const result = userProfileSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.age).toBe(29);
      expect(result.data.dateOfBirth).toBe("1997-04-15");
      expect(result.data.address).toBe(
        "123 Innovation Way, Suite 400, Tech City"
      );
    }
  });

  describe("Name Field Validation", () => {
    it("should trim surrounding whitespace from name", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        name: "   Alice Cooper   ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Alice Cooper");
      }
    });

    it("should reject names shorter than 2 characters after trimming", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        name: " A ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Name must be at least 2 characters"
        );
      }
    });

    it("should reject whitespace-only names", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        name: "     ",
      });
      expect(result.success).toBe(false);
    });

    it("should reject names exceeding 100 characters", () => {
      const longName = "A".repeat(101);
      const result = userProfileSchema.safeParse({
        ...validPayload,
        name: longName,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Name cannot exceed 100 characters"
        );
      }
    });
  });

  describe("Age Field Validation", () => {
    it("should accept valid string numbers and coerce to integer", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        age: "35",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(35);
      }
    });

    it("should accept minimum age of 0", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        age: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(0);
      }
    });

    it("should accept maximum age of 150", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        age: 150,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(150);
      }
    });

    it("should reject negative age", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        age: -1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Age cannot be negative"
        );
      }
    });

    it("should reject age above 150", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        age: 151,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Age cannot exceed 150"
        );
      }
    });

    it("should reject non-integer / floating-point age", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        age: 25.5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Age must be a whole integer"
        );
      }
    });
  });

  describe("Date of Birth Validation", () => {
    it("should accept today as date of birth", () => {
      const today = getTodayDateString();
      const result = userProfileSchema.safeParse({
        ...validPayload,
        dateOfBirth: today,
      });
      expect(result.success).toBe(true);
    });

    it("should reject future dates", () => {
      const futureDate = "2099-12-31";
      const result = userProfileSchema.safeParse({
        ...validPayload,
        dateOfBirth: futureDate,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Date of birth cannot be in the future"
        );
      }
    });

    it("should reject malformed or invalid calendar dates", () => {
      expect(isValidCalendarDate("2023-02-30")).toBe(false); // Feb 30 does not exist
      expect(isValidCalendarDate("invalid-date")).toBe(false);
      expect(isValidCalendarDate("2023-13-01")).toBe(false); // Month 13

      const result = userProfileSchema.safeParse({
        ...validPayload,
        dateOfBirth: "2023-02-30",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Address Field Validation", () => {
    it("should trim whitespace from address", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        address: "   456 High Street, New York, NY   ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe("456 High Street, New York, NY");
      }
    });

    it("should reject addresses shorter than 5 characters", () => {
      const result = userProfileSchema.safeParse({
        ...validPayload,
        address: "Home",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Address must be at least 5 characters"
        );
      }
    });

    it("should reject addresses longer than 500 characters", () => {
      const longAddress = "A".repeat(501);
      const result = userProfileSchema.safeParse({
        ...validPayload,
        address: longAddress,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Address cannot exceed 500 characters"
        );
      }
    });
  });
});
