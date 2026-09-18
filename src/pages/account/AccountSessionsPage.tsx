import { useMyActiveSessionsQuery, useRevokeSessionMutation } from "@/api/sessionsApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateViews";
import { useLogoutHandler } from "@/features/auth/useLogoutHandler";
import { formatDateTime } from "@/lib/format";

export function AccountSessionsPage() {
  const { data: sessions, isLoading, isError, refetch } = useMyActiveSessionsQuery();
  const [revokeSession, { isLoading: isRevoking }] = useRevokeSessionMutation();
  const { handleLogout, isLoggingOut } = useLogoutHandler();

  // onQueryStarted (sessionsApi.ts) already toasts the backend's message.
  const handleRevoke = (sessionId: number) => {
    void revokeSession(sessionId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-content-primary">Account &amp; sessions</h1>
        <p className="text-sm text-content-muted">Devices and browsers currently signed in to your account.</p>
      </div>

      {isLoading && <LoadingState label="Loading sessions…" />}
      {isError && <ErrorState message="Couldn't load your sessions." onRetry={refetch} />}
      {!isLoading && !isError && sessions && sessions.length === 0 && (
        <EmptyState title="No active sessions" />
      )}

      {!isLoading && !isError && sessions && sessions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">IP address</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="max-w-xs truncate text-content-primary">
                        {session.userAgent ?? "Unknown device"}
                      </span>
                      {session.isCurrent && <Badge tone="brand">This device</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-content-secondary">{session.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 text-content-secondary">{formatDateTime(session.createdAt)}</td>
                  <td className="px-4 py-3 text-content-secondary">{formatDateTime(session.lastSeenAt)}</td>
                  <td className="px-4 py-3 text-content-secondary">{formatDateTime(session.expiresAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {session.isCurrent ? (
                      <Button variant="secondary" onClick={handleLogout} isLoading={isLoggingOut}>
                        Log out
                      </Button>
                    ) : (
                      <Button variant="danger" onClick={() => handleRevoke(session.id)} isLoading={isRevoking}>
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
