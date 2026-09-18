import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/useAuth";
import { NotPermittedState } from "@/components/ui/StateViews";

// Gates individual admin routes. Renders a "not permitted" state (not a
// silent redirect) on failure — defense in depth, not the primary gate;
// failing here means the nav itself was wrong to show the link.
export function RequireFeature({ codename, children }: { codename: string; children: ReactNode }) {
  const { user, hasFeature } = useAuth();

  if (!hasFeature(codename)) {
    // A role with zero features assigned fails every RequireFeature check,
    // including the "/" dashboard route it lands on right after login — so
    // that specific case gets a message pointing at the actual fix (ask an
    // admin) instead of the generic "not permitted" dead end.
    if (user?.role.features.length === 0) {
      return (
        <NotPermittedState>
          <p className="max-w-sm text-sm text-content-muted">
            Your role ({user.role.title}) doesn't have any features assigned yet. Ask an administrator to grant
            access, or visit your{" "}
            <Link to="/account" className="text-brand-600 underline underline-offset-2">
              account page
            </Link>
            .
          </p>
        </NotPermittedState>
      );
    }

    return <NotPermittedState />;
  }

  return <>{children}</>;
}
