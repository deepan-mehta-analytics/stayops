"use client";                                                   // uses hooks, browser APIs, and useSearchParams
import { useState, useEffect }    from "react";                   // component state + mount effect
import { useRouter, useSearchParams } from "next/navigation";     // URL params + navigation
import Link                       from "next/link";               // back-to-login link
import { getSupabaseBrowser }     from "@/lib/supabase/browser"; // browser-side Supabase client

// ── ResetPasswordForm — PKCE code exchange + new password form ────────────────
// Mount: reads ?code= from URL, calls exchangeCodeForSession to establish session.
// Submit: calls updateUser({ password }) and redirects to dashboard on success.
export function ResetPasswordForm() {
  const router       = useRouter();                               // for redirect to dashboard on success
  const searchParams = useSearchParams();                         // read ?code= from URL

  // ── State — exchange errors and form errors tracked separately ─────────────
  // Exchange error: fired when the PKCE code itself is invalid/expired → no form shown.
  // Form error: fired by password mismatch or updateUser failure → form stays visible.
  const [password,       setPassword]       = useState("");                     // new password input
  const [confirm,        setConfirm]        = useState("");                     // confirm password input
  const [loading,        setLoading]        = useState(false);                  // disables button during updateUser
  const [exchanging,     setExchanging]     = useState(true);                   // true while exchangeCodeForSession runs
  const [exchangeError,  setExchangeError]  = useState<string | null>(null);   // code exchange failure message
  const [formError,      setFormError]      = useState<string | null>(null);   // password validation or updateUser error
  const [success,        setSuccess]        = useState(false);                  // true after password updated

  // ── Effect: exchange PKCE code for a session on mount ─────────────────────
  useEffect(() => {
    const code = searchParams.get("code");                       // PKCE recovery code from Supabase email link

    if (!code) {
      setExchangeError("Invalid or expired reset link. Please request a new one."); // no code → link is broken
      setExchanging(false);                                      // stop loading state
      return;
    }

    const supabase = getSupabaseBrowser();                       // browser Supabase client
    supabase.auth
      .exchangeCodeForSession(code)                              // exchange PKCE code → JWT session cookie
      .then(({ error: exchangeErr }) => {
        if (exchangeErr) {
          setExchangeError("This reset link has expired. Please request a new one."); // code invalid or stale
        }
        setExchanging(false);                                    // reveal the password form (or exchange error)
      });
  }, [searchParams]);                                            // searchParams stable across renders

  // ── Submit: update password via Supabase Auth ──────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();                                          // prevent native form navigation

    if (password !== confirm) {
      setFormError("Passwords do not match.");                   // client-side mismatch check
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");  // enforce minimum length
      return;
    }

    setLoading(true);                                            // disable button during request
    setFormError(null);                                          // clear previous form error

    const supabase = getSupabaseBrowser();                       // browser client for updateUser
    const { error: updateError } = await supabase.auth.updateUser({ password }); // set new password

    if (updateError) {
      setFormError(updateError.message);                         // surface Supabase error (e.g. same password)
      setLoading(false);                                         // re-enable button
      return;
    }

    setSuccess(true);                                            // show success state
    setTimeout(() => router.push("/dashboard"), 2000);          // redirect to dashboard after brief pause
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const cardClass =
    "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"; // card shell

  const inputClass =
    "rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 " +
    "transition-all duration-150";                               // shared focus ring style

  const btnClass =
    "w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white " +
    "font-semibold text-sm transition-all duration-150 hover:scale-105 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"; // CTA button style

  // ── Loading: code exchange in progress ─────────────────────────────────────
  if (exchanging) {
    return (
      <div className={cardClass}>
        <p className="text-center text-slate-500 text-sm py-4">
          Verifying reset link…
        </p>
      </div>
    );
  }

  // ── Exchange failed: link is broken or expired — show error only, no form ──
  if (exchangeError) {
    return (
      <div className={cardClass}>
        <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {exchangeError}
        </div>
        <Link
          href="/login"
          className="text-sm text-emerald-600 hover:text-emerald-500 text-center transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  // ── Success: password updated ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-3" aria-hidden="true">✅</div>  {/* decorative icon */}
        <p className="text-emerald-700 font-semibold">Password updated!</p>
        <p className="text-emerald-600 text-sm mt-1">Taking you to your dashboard…</p>
      </div>
    );
  }

  // ── Default: new password form (exchange succeeded, not yet submitted) ──────
  return (
    <form onSubmit={handleSubmit} className={cardClass} noValidate>

      {/* New password field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}           // controlled new password input
          className={inputClass}
        />
      </div>

      {/* Confirm password field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}            // controlled confirm input
          className={inputClass}
        />
      </div>

      {/* Form error — password mismatch or updateUser failure */}
      {formError && (
        <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {formError}
        </div>
      )}

      {/* Set new password button */}
      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className={btnClass}
      >
        {loading ? "Updating password…" : "Set new password"}
      </button>

      {/* Back to sign in */}
      <Link
        href="/login"
        className="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors"
      >
        ← Back to sign in
      </Link>

    </form>
  );
}
