import { useState } from "react";
import { Link } from "react-router-dom";

import { useDeleteRoleMutation, useListRolesQuery, useListRoleTypesQuery } from "@/api/rolesApi";
import type { AdminRole } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";

import { SessionTimeoutSection } from "./SessionTimeoutSection";

export function RolesListPage() {
  const { data: roles, isLoading, isError, refetch } = useListRolesQuery();
  const { data: roleTypes } = useListRoleTypesQuery();
  const { hasRoleType, canWriteFeature } = useAuth();
  const canWriteRoles = canWriteFeature("role_management");

  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();
  const [pendingDelete, setPendingDelete] = useState<AdminRole | null>(null);

  const roleTypeLabel = (roleTypeId: number) => roleTypes?.find((rt) => rt.id === roleTypeId)?.label ?? "—";

  const handleDelete = async () => {
    if (!pendingDelete) return;
    // onQueryStarted (rolesApi.ts) already surfaces the backend's message —
    // including the 409 ("still assigned to users") as-is.
    await deleteRole(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-content-primary">Roles</h1>
          <p className="text-sm text-content-muted">Role profiles and the features they grant.</p>
        </div>
        {canWriteRoles && (
          <Link to="/admin/roles/new">
            <Button>New role</Button>
          </Link>
        )}
      </div>

      {isLoading && <LoadingState label="Loading roles…" />}
      {isError && <ErrorState message="Couldn't load roles." onRetry={refetch} />}
      {!isLoading && !isError && roles && roles.length === 0 && <EmptyState title="No roles yet" />}

      {!isLoading && !isError && roles && roles.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Role type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Features</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="px-4 py-3 text-content-primary">{role.title}</td>
                  <td className="px-4 py-3 text-content-secondary">{roleTypeLabel(role.role_type_id)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={role.is_active ? "success" : "neutral"}>
                      {role.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-content-secondary">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="neutral">{role.features.length} enabled</Badge>
                      <Badge tone="brand">
                        {(role.feature_permissions ?? []).filter((permission) => permission.can_write).length} write
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canWriteRoles && (
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/roles/${role.id}`}>
                          <Button variant="secondary">Edit</Button>
                        </Link>
                        <Button variant="danger" onClick={() => setPendingDelete(role)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasRoleType("super_admin") && canWriteRoles && <SessionTimeoutSection />}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this role?"
        description={`"${pendingDelete?.title}" will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
