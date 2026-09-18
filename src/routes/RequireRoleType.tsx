import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/useAuth";
import type { RoleTypeCode } from "@/api/types";
import { NotPermittedState } from "@/components/ui/StateViews";

// Mirrors §1a's meta-admin restriction (Features admin write actions are
// super_admin-only). Same defense-in-depth posture as RequireFeature.
export function RequireRoleType({ code, children }: { code: RoleTypeCode; children: ReactNode }) {
  const { hasRoleType } = useAuth();

  if (!hasRoleType(code)) return <NotPermittedState />;

  return <>{children}</>;
}
