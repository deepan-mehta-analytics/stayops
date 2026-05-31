// ── Reset password page — handles Supabase PKCE recovery callback ────────────
// Supabase emails the user a link that redirects here with ?code=<pkce-code>.
// The ResetPasswordForm client component exchanges the code for a session,
// then lets the user set a new password via updateUser.

import { Suspense }        from "react";                           // required: useSearchParams in child needs Suspense boundary
import { ResetPasswordForm } from "@/components/auth/reset-password-form"; // client-side form

// ── Page — server component shell, delegates all client work to the form ──────
export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
      <div className="w-full max-w-sm">

        {/* Page heading */}
        <div className="text-center mb-6">
          <h1 className="font-[family-name:var(--font-poppins)] font-semibold text-2xl text-slate-900">
            Set a new password
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your new password below
          </p>
        </div>

        {/* Suspense required because ResetPasswordForm uses useSearchParams */}
        <Suspense fallback={
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-slate-500 text-sm">
            Loading…
          </div>
        }>
          {/* Client form — reads ?code= from URL, calls exchangeCodeForSession */}
          <ResetPasswordForm />
        </Suspense>

      </div>
    </div>
  );
}
