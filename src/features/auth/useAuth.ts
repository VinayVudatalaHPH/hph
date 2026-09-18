import { useAppSelector } from "@/app/hooks";
import type { RoleTypeCode } from "@/api/types";

import { canManageRoleType } from "./hierarchy";

// Derived helpers used by nav/guards **for UX only** — the backend is
// always the real authority (require_feature/require_role run on every
// request regardless of what the UI shows or hides).
export function useAuth() {
  const user = useAppSelector((state) => state.auth.user);
  const status = useAppSelector((state) => state.auth.status);

  return {
    user,
    isLoading: status === "idle" || status === "loading",
    isAuthenticated: status === "authenticated" && user !== null,
    hasFeature: (codename: string) => Boolean(user?.role.features.includes(codename)),
    hasRoleType: (code: RoleTypeCode) => user?.role.roleType === code,
    canManageRoleType: (targetRoleType: RoleTypeCode) => canManageRoleType(user?.role.roleType, targetRoleType),
  };
}
