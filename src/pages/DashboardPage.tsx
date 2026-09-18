import { useAuth } from "@/features/auth/useAuth";

// Empty/placeholder content — Phase 4 builds the real dashboard. This page
// only exists to prove the `dashboard` feature gate and the shell work.
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="rounded-lg border border-border bg-surface p-8">
      <h1 className="text-lg font-semibold text-content-primary">Welcome, {user?.firstName}.</h1>
      <p className="mt-2 text-sm text-content-muted">
        This is a placeholder landing page — the real dashboard ships in Phase 4.
      </p>
    </div>
  );
}
