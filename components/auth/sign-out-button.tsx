"use client";                                                   // uses useRouter — browser only
import { useRouter }          from "next/navigation";           // for redirect after sign-out
import { getSupabaseBrowser } from "@/lib/supabase/browser";   // browser-side Supabase client
import { Button }             from "@/components/ui/button";   // shadcn ghost icon button
import { LogOut }             from "lucide-react";             // logout icon

// ── Sign-out icon button — lives in the ops console nav ──────────────────────
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();                                   // for redirect after sign-out

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();                      // get browser Supabase client
    await supabase.auth.signOut();                              // clear session cookie
    router.push("/");                                           // redirect to marketing landing page
    router.refresh();                                           // force Server Components to re-read (no) session
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Sign out"
      className={className}                                     // forwarded so nav can set colour on dark bg
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" />                           {/* door-with-arrow logout icon */}
    </Button>
  );
}
