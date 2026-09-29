import { UserProfileForm } from "@/components/form/UserProfileForm";
import { ShieldCheck, Zap, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="w-full max-w-[600px] flex flex-col gap-6 animate-fadeIn">
      {/* HEADER BRANDING */}
      <header className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center justify-center sm:justify-start gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Zap className="w-5 h-5 fill-current" aria-hidden="true" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">
              Form<span className="text-blue-600">Forge</span> AI
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-xs font-medium text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Dual-Zod Validated
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 text-blue-700">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" /> RLS Protected
          </span>
        </div>
      </header>

      {/* REUSABLE FORM COMPONENT */}
      <UserProfileForm />
    </div>
  );
}
