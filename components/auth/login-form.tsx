"use client";                                                   // uses hooks + browser APIs — client component only
import { useState }           from "react";                       // component state
import { useRouter }          from "next/navigation";             // client-side navigation
import Link                   from "next/link";                   // home link (prefetch-safe)
import { getSupabaseBrowser } from "@/lib/supabase/browser";     // browser-side Supabase client

// ── Mode — controls which view the card shows ─────────────────────────────────
type Mode = "signin" | "forgot" | "forgot-sent";                  // three distinct card states

interface LoginFormProps {
  next: string;                                                   // redirect path after successful sign-in
}

// ── LoginForm — sign-in card with inline forgot-password flow ─────────────────
export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();                                     // for redirect after sign-in

  // ── Shared state ──────────────────────────────────────────────────────────
  const [mode,     setMode]     = useState<Mode>("signin");       // current card view
  const [email,    setEmail]    = useState("");                   // controlled email input (shared across modes)
  const [password, setPassword] = useState("");                   // controlled password input (signin only)
  const [loading,  setLoading]  = useState(false);               // disables button during async request
  const [error,    setError]    = useState<string | null>(null); // error message displayed below form

  // ── Sign-in submit ─────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();                                           // prevent native form navigation
    setLoading(true);                                             // disable button immediately
    setError(null);                                               // clear previous error

    const supabase = getSupabaseBrowser();                        // get browser Supabase client
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,                                                      // from controlled input
      password,                                                   // from controlled input
    });

    if (authError) {
      setError("Invalid email or password.");                     // generic — never reveal which field is wrong
      setLoading(false);                                          // re-enable button on failure
      return;
    }

    router.push(next);                                            // navigate to intended destination
    router.refresh();                                             // force Server Component re-render with new session
  }

  // ── Forgot password submit ────────────────────────────────────────────────
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();                                           // prevent native form navigation
    setLoading(true);                                             // disable button immediately
    setError(null);                                               // clear previous error

    const supabase = getSupabaseBrowser();                        // get browser Supabase client
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,    // PKCE callback lands on /reset-password
    });

    if (resetError) {
      setError("Something went wrong. Please try again.");        // generic error — avoids email enumeration
      setLoading(false);                                          // re-enable button on failure
      return;
    }

    setMode("forgot-sent");                                       // show success message
    setLoading(false);                                            // restore button state
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function switchToForgot() {
    setError(null);                                               // clear sign-in errors before switching views
    setMode("forgot");                                            // show forgot-password email input
  }

  function switchToSignIn() {
    setError(null);                                               // clear forgot-password errors before switching
    setMode("signin");                                            // return to sign-in view
  }

  // ── Shared card wrapper ───────────────────────────────────────────────────
  const cardClass =
    "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"; // consistent card styling

  // ── Input class — reused on every text input ──────────────────────────────
  const inputClass =
    "rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 " +
    "transition-all duration-150";                                // shared focus ring style

  // ── Submit button class — reused across modes ──────────────────────────────
  const btnClass =
    "w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white " +
    "font-semibold text-sm transition-all duration-150 hover:scale-105 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"; // consistent CTA style

  // ── Error block ────────────────────────────────────────────────────────────
  const errorBlock = error && (
    <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      {error}
    </div>
  );

  // ── Mode: forgot-sent — success state ──────────────────────────────────────
  if (mode === "forgot-sent") {
    return (
      <div className={cardClass}>

        {/* Success icon + heading */}
        <div className="text-center">
          <div className="text-3xl mb-3" aria-hidden="true">📬</div>  {/* decorative email icon */}
          <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-xl text-slate-900">
            Check your inbox
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            We sent a reset link to <strong className="text-slate-700">{email}</strong>
          </p>
        </div>

        {/* Back to sign-in link */}
        <button
          type="button"
          onClick={switchToSignIn}
          className="text-sm text-emerald-600 hover:text-emerald-500 text-center transition-colors"
        >
          ← Back to sign in
        </button>

        {/* Home link */}
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors"
        >
          ← Back to StayOps
        </Link>

      </div>
    );
  }

  // ── Mode: forgot — email + reset request ──────────────────────────────────
  if (mode === "forgot") {
    return (
      <form onSubmit={handleForgotPassword} className={cardClass} noValidate>

        {/* Card heading */}
        <div>
          <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-xl text-slate-900">
            Reset your password
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>

        {/* Email field — pre-filled if user typed it on sign-in view */}
        <div className="flex flex-col gap-1">
          <label htmlFor="reset-email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}            // update shared email state
            className={inputClass}
          />
        </div>

        {errorBlock}                                              {/* inline error if reset request fails */}

        {/* Send reset link button */}
        <button
          type="submit"
          disabled={loading || !email}
          className={btnClass}
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>

        {/* Back to sign-in — inline link, no page navigation */}
        <button
          type="button"
          onClick={switchToSignIn}
          className="text-sm text-slate-500 hover:text-slate-700 text-center transition-colors"
        >
          ← Back to sign in
        </button>

        {/* Home link */}
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors"
        >
          ← Back to StayOps
        </Link>

      </form>
    );
  }

  // ── Mode: signin (default) — email + password + forgot link ──────────────
  return (
    <form onSubmit={handleSignIn} className={cardClass} noValidate>

      {/* Card heading */}
      <div>
        <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-xl text-slate-900">
          Sign in to your workspace
        </h2>
        <p className="text-slate-500 text-sm mt-1">StayOps operator console</p>
      </div>

      {/* Email field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}              // update shared email state
          className={inputClass}
        />
      </div>

      {/* Password field + forgot-password link */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <button
            type="button"
            onClick={switchToForgot}
            className="text-xs text-emerald-600 hover:text-emerald-500 transition-colors"
          >
            Forgot password?
          </button>                                               {/* triggers inline forgot-password view */}
        </div>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}           // controlled password input
          className={inputClass}
        />
      </div>

      {errorBlock}                                                {/* inline error if sign-in fails */}

      {/* Sign in button */}
      <button
        type="submit"
        disabled={loading || !email || !password}
        className={btnClass}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      {/* Home link — bottom of card */}
      <Link
        href="/"
        className="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors"
      >
        ← Back to StayOps
      </Link>

    </form>
  );
}
