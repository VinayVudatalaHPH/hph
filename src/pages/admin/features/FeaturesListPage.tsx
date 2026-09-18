import { useState } from "react";
import { Link } from "react-router-dom";

import { useDeactivateFeatureMutation, useListFeaturesQuery } from "@/api/featuresApi";
import type { Feature } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useAuth } from "@/features/auth/useAuth";

export function FeaturesListPage() {
  const { data: features, isLoading, isError, refetch } = useListFeaturesQuery();
  const { hasRoleType } = useAuth();
  const canManageFeatures = hasRoleType("super_admin");

  const [deactivateFeature, { isLoading: isDeactivating }] = useDeactivateFeatureMutation();
  const [pendingDeactivate, setPendingDeactivate] = useState<Feature | null>(null);

  const handleDeactivate = async () => {
    if (!pendingDeactivate) return;
    // onQueryStarted (featuresApi.ts) already toasts the backend's message.
    await deactivateFeature(pendingDeactivate.id);
    setPendingDeactivate(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-content-primary">Features</h1>
          <p className="text-sm text-content-muted">The feature flags roles can be granted.</p>
        </div>
        {canManageFeatures && (
          <Link to="/admin/features/new">
            <Button>New feature</Button>
          </Link>
        )}
      </div>

      {isLoading && <LoadingState label="Loading features…" />}
      {isError && <ErrorState message="Couldn't load features." onRetry={refetch} />}
      {!isLoading && !isError && features && features.length === 0 && (
        <EmptyState title="No features yet" />
      )}

      {!isLoading && !isError && features && features.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Codename</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManageFeatures && <th className="px-4 py-3 font-medium" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {features.map((feature) => (
                <tr key={feature.id}>
                  <td className="px-4 py-3 font-mono text-xs text-content-primary">{feature.codename}</td>
                  <td className="px-4 py-3 text-content-primary">{feature.title}</td>
                  <td className="px-4 py-3 max-w-sm truncate text-content-secondary">{feature.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={feature.active ? "success" : "neutral"}>
                      {feature.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  {canManageFeatures && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/features/${feature.id}`}>
                          <Button variant="secondary">Edit</Button>
                        </Link>
                        {feature.active && (
                          <Button variant="danger" onClick={() => setPendingDeactivate(feature)}>
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate this feature?"
        description={`"${pendingDeactivate?.title}" will no longer be assignable to roles. Roles that already have it will lose access.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setPendingDeactivate(null)}
      />
    </div>
  );
}
