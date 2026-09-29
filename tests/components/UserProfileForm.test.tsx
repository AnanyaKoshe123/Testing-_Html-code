import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserProfileForm } from "@/components/form/UserProfileForm";

describe("UserProfileForm Component Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all form fields, labels, required indicators, and action buttons", () => {
    render(<UserProfileForm />);

    expect(screen.getByRole("heading", { name: /basic user profile/i })).toBeInTheDocument();

    // Check inputs and their associated labels
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/residential address/i)).toBeInTheDocument();

    // Check buttons
    expect(screen.getByRole("button", { name: /submit profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear form/i })).toBeInTheDocument();
  });

  it("displays validation errors and sets aria-invalid when submitted empty", async () => {
    render(<UserProfileForm />);

    const submitBtn = screen.getByRole("button", { name: /submit profile/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute("aria-invalid", "true");
    });

    expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/age is required/i)).toBeInTheDocument();
    expect(screen.getByText(/date of birth is required/i)).toBeInTheDocument();
    expect(screen.getByText(/address must be at least 5 characters/i)).toBeInTheDocument();
  });

  it("shows confirmation dialog when clearing a dirty form and resets on confirmation", async () => {
    const user = userEvent.setup();
    render(<UserProfileForm />);

    const nameInput = screen.getByLabelText(/full name/i);
    await user.type(nameInput, "Samantha Reed");

    const clearBtn = screen.getByRole("button", { name: /clear form/i });
    await user.click(clearBtn);

    // Confirmation dialog should appear
    expect(screen.getByRole("dialog", { name: /clear form details\?/i })).toBeInTheDocument();
    expect(screen.getByText(/clearing will discard all field entries/i)).toBeInTheDocument();

    // Click "Keep Editing"
    const cancelBtn = screen.getByRole("button", { name: /keep editing/i });
    await user.click(cancelBtn);

    // Dialog closed and value is still intact
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(nameInput).toHaveValue("Samantha Reed");

    // Click clear again and confirm
    await user.click(clearBtn);
    const confirmBtn = screen.getByRole("button", { name: /yes, clear all/i });
    await user.click(confirmBtn);

    // Value should be cleared
    expect(nameInput).toHaveValue("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles successful form submission and presents accessible success state", async () => {
    const user = userEvent.setup();

    // Mock fetch API response
    const mockSuccessResponse = {
      success: true,
      submission_id: "test-sub-12345",
      status: "submitted",
      idempotency_key: "idem-key-test",
      message: "Profile submitted successfully!",
      created_at: new Date().toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse,
    } as Response);

    render(<UserProfileForm />);

    await user.type(screen.getByLabelText(/full name/i), "Johnathan Swift");
    await user.type(screen.getByLabelText(/age/i), "32");
    await user.type(screen.getByLabelText(/date of birth/i), "1992-05-18");
    await user.type(screen.getByLabelText(/residential address/i), "789 Pine Road, Apt 2B, Metropolis");

    const submitBtn = screen.getByRole("button", { name: /submit profile/i });
    await user.click(submitBtn);

    // Verify accessible success state
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    expect(screen.getByText(/profile saved successfully!/i)).toBeInTheDocument();
    expect(screen.getByText("test-sub-12345")).toBeInTheDocument();
  });

  it("preserves entered data when server returns an error", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: "Database temporary connection error. Please retry.",
      }),
    } as Response);

    render(<UserProfileForm />);

    const nameInput = screen.getByLabelText(/full name/i);
    const addressInput = screen.getByLabelText(/residential address/i);

    await user.type(nameInput, "Robert Falcon");
    await user.type(screen.getByLabelText(/age/i), "44");
    await user.type(screen.getByLabelText(/date of birth/i), "1980-01-10");
    await user.type(addressInput, "101 Polar Explorer Way, South Base");

    const submitBtn = screen.getByRole("button", { name: /submit profile/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText(/database temporary connection error/i)).toBeInTheDocument();
    // Verify inputs preserved
    expect(nameInput).toHaveValue("Robert Falcon");
    expect(addressInput).toHaveValue("101 Polar Explorer Way, South Base");
  });
});
