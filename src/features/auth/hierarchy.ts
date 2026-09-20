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

// Which role types' users should appear in an analyst-picker dropdown (e.g.
// Kairon's "Analyst(s)" filter) for a given viewer. Deliberately separate
// from CAN_MANAGE_ROLE_TYPE above: a lead can't manage anyone, but should
// still see the employees under them when filtering chart records.
const VISIBLE_ANALYST_ROLE_TYPES: Record<RoleTypeCode, ReadonlySet<RoleTypeCode>> = {
  super_admin: new Set(["lead", "employee"]),
  admin: new Set(["lead", "employee"]),
  manager: new Set(["lead", "employee"]),
  lead: new Set(["employee"]),
  employee: new Set(),
};

export function visibleAnalystRoleTypes(actorRoleType: RoleTypeCode | undefined): RoleTypeCode[] {
  if (!actorRoleType) return [];
  return Array.from(VISIBLE_ANALYST_ROLE_TYPES[actorRoleType]);
}
