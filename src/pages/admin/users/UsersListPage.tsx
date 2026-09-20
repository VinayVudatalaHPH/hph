import { useState } from "react";
import { Link } from "react-router-dom";

import { useDeactivateUserMutation, useListUsersQuery, type UserStatusFilter } from "@/api/usersApi";
import { PROJECTS, type AdminUser } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";

const TABS: { key: UserStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const projectName = (projectId: number | null) => PROJECTS.find((p) => p.id === projectId)?.name ?? "—";

export function UsersListPage() {
  const [statusTab, setStatusTab] = useState<UserStatusFilter>("all");
  const { data: users, isLoading, isError, refetch } = useListUsersQuery(statusTab);
  const { canManageRoleType, canWriteFeature } = useAuth();
  const canWriteUsers = canWriteFeature("user_management");

  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(null);
  const userNameById = new Map(users?.map((user) => [user.id, `${user.first_name} ${user.last_name}`]));

  const handleDeactivate = async () => {
    if (!pendingDeactivate) return;
    // onQueryStarted (usersApi.ts) already toasts the backend's message.
    await deactivateUser(pendingDeactivate.id);
    setPendingDeactivate(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-content-primary">Users</h1>
          <p className="text-sm text-content-muted">Everyone with an account in this system.</p>
        </div>
        {canWriteUsers && (
          <Link to="/admin/users/new">
            <Button>New user</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium ${
              statusTab === tab.key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState label="Loading users…" />}
      {isError && <ErrorState message="Couldn't load users." onRetry={refetch} />}
      {!isLoading && !isError && users && users.length === 0 && <EmptyState title="No users in this view" />}

      {!isLoading && !isError && users && users.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Employee ID</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Reports to</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const canManage = canWriteUsers && canManageRoleType(user.role.roleType);
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-content-primary">
                      <div className="flex items-center gap-2">
                        <span>
                          {user.first_name} {user.last_name}
                        </span>
                        {user.first_login && <Badge tone="warning">First login</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-secondary">{user.email}</td>
                    <td className="px-4 py-3 text-content-secondary">{user.emp_id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-content-primary">{user.role.title}</span>
                        <Badge tone="brand">{user.role.roleType}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-secondary">{projectName(user.project_id)}</td>
                    <td className="px-4 py-3 text-content-secondary">
                      {user.reports_to_id ? userNameById.get(user.reports_to_id) ?? "Unknown user" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.is_active ? "success" : "neutral"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canManage && (
                          <Link to={`/admin/users/${user.id}`}>
                            <Button variant="secondary">Edit</Button>
                          </Link>
                        )}
                        {user.is_active && canManage && (
                          <Button variant="danger" onClick={() => setPendingDeactivate(user)}>
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate this user?"
        description={`${pendingDeactivate?.first_name} ${pendingDeactivate?.last_name} will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </div>
  );
}
