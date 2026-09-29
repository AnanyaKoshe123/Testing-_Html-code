import { UserProfileForm } from "@/components/form/UserProfileForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "User Profile Form | FormForge AI",
  description: "Fill out and submit your basic user profile details.",
};

export default function UserProfileFormPage() {
  return (
    <div className="w-full max-w-[600px] flex flex-col gap-6 animate-fadeIn">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors p-1 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Overview
        </Link>
      </div>

      <UserProfileForm />
    </div>
  );
}
