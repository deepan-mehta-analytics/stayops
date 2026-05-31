"use client";                                                  // uses useState, useRouter — browser only
import { useState }           from "react";                    // component state
import { useRouter }          from "next/navigation";          // client-side navigation
import { getSupabaseBrowser } from "@/lib/supabase/browser";  // browser-side Supabase client

interface LoginFormProps {
  next: string;                                                // redirect path after successful sign-in
}

// ── Email + password sign-in form ────────────────────────────────────────────
export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();                                  // for client-side redirect after sign-in

  const [email,    setEmail]    = useState("");                // controlled email input
  const [password, setPassword] = useState("");                // controlled password input
  const [loading,  setLoading]  = useState(false);            // disables button during request
  const [error,    setError]    = useState<string | null>(null); // error message below form

  // ── Submit: call Supabase signInWithPassword ──────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();                                        // prevent native form navigation
    setLoading(true);                                          // disable button immediately
    setError(null);                                            // clear any previous error

    const supabase = getSupabaseBrowser();                     // get browser Supabase client
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,                                                   // from controlled input
      password,                                                // from controlled input
    });

    if (authError) {
      setError("Invalid email or password.");                  // never leak which field is wrong
      setLoading(false);                                       // re-enable button on error
      return;
    }

    router.push(next);                                         // navigate to the intended destination
    router.refresh();                                          // force Server Component re-render with new session
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"
      noValidate
    >

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
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                     transition-all duration-150"
        />
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                     transition-all duration-150"
        />
      </div>

      {/* Error message */}
      {error && (
        <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white
                   font-semibold text-sm transition-all duration-150 hover:scale-105
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

    </form>
  );
}
