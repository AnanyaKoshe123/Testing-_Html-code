import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basic User Profile Form | FormForge AI",
  description:
    "Production-ready Basic User Profile Form built with Next.js App Router, TypeScript strict mode, Zod, React Hook Form, and Supabase PostgreSQL with Row Level Security.",
  keywords: ["FormForge AI", "User Profile", "Next.js", "Zod", "Supabase", "React Hook Form"],
  authors: [{ name: "FormForge AI Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allows 200%+ zoom as per accessibility requirements
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#f0f7ff] text-slate-900 antialiased selection:bg-blue-200 selection:text-blue-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg"
        >
          Skip to main content
        </a>
        <main id="main-content" className="flex-1 flex flex-col justify-center items-center py-10 px-4 sm:px-6">
          {children}
        </main>
        <footer className="py-6 text-center text-xs text-slate-500 border-t border-blue-100/60">
          <p>FormForge AI &copy; 2026. Production Form Infrastructure with Zero-Trust RLS Security.</p>
        </footer>
      </body>
    </html>
  );
}
