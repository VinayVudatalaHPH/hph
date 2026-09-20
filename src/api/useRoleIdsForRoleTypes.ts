import { useListRoleTypesQuery, useListRolesQuery } from "./rolesApi";
import type { RoleTypeCode } from "./types";

// GET /users/filter's `roleIds` takes specific Role ids, not RoleType ids —
// a project's roles are custom-titled (e.g. "HPH Coding Analyst") but each
// is always tagged with exactly one of the five fixed RoleTypes. This
// resolves a set of RoleType codes down to the Role ids that back them.
// Returns undefined while role types/roles are still loading, and an empty
// array (never all roles) if `roleTypes` is empty — callers should treat
// undefined as "not ready yet" and [] as "matches nothing".
export function useRoleIdsForRoleTypes(roleTypes: RoleTypeCode[]): number[] | undefined {
  const { data: roleTypeRows } = useListRoleTypesQuery();
  const { data: roles } = useListRolesQuery();

  if (!roleTypeRows || !roles) return undefined;

  const matchingRoleTypeIds = new Set(
    roleTypeRows.filter((roleType) => roleTypes.includes(roleType.code)).map((roleType) => roleType.id),
  );
  return roles.filter((role) => matchingRoleTypeIds.has(role.role_type_id)).map((role) => role.id);
}
