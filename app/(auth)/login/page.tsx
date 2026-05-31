// ── Login page — server component, awaits searchParams for redirect target ───
import { LoginForm } from "@/components/auth/login-form";     // client-side sign-in form

// ── Page — async server component following Next.js 16 searchParams pattern ──
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;                   // Next.js 16: searchParams is a Promise
}) {
  const { next } = await searchParams;                         // resolve the async searchParams Promise

  return (
    <div className="w-full max-w-sm">

      {/* StayOps wordmark + tagline */}
      <div className="text-center mb-8">
        <span className="font-[family-name:var(--font-poppins)] font-semibold text-2xl text-slate-900">
          StayOps
        </span>
        <p className="text-slate-500 text-sm mt-1">
          Sign in to your workspace
        </p>
      </div>

      {/* Email + password form — passes next redirect path down as prop */}
      <LoginForm next={next ?? "/dashboard"} />

    </div>
  );
}
