import type { RoleTypeCode } from "@/api/types";

// Client-side mirror of backend/app/users/hierarchy.py's CAN_MANAGE_ROLE_TYPE
// table, used only to pre-filter dropdown options / hide actions in the UI.
// The backend re-enforces the real check on every request regardless — this
// is UX only, never the actual authorization boundary.
const CAN_MANAGE_ROLE_TYPE: Record<RoleTypeCode, ReadonlySet<RoleTypeCode>> = {
  super_admin: new Set(["admin", "manager", "lead", "employee"]),
  admin: new Set(["manager", "lead", "employee"]),
  manager: new Set(["lead", "employee"]),
  lead: new Set(),
  employee: new Set(),
};

export function canManageRoleType(actorRoleType: RoleTypeCode | undefined, targetRoleType: RoleTypeCode): boolean {
  if (!actorRoleType) return false;
  return CAN_MANAGE_ROLE_TYPE[actorRoleType].has(targetRoleType);
}
