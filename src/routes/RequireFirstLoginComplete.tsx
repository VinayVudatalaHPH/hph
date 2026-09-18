import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/features/auth/useAuth";

// The literal implementation of §2's "first_login gates the rest of the
// app": redirects to /set-password regardless of the originally requested
// route. /set-password itself is deliberately NOT wrapped in this guard —
// it's this guard's own destination.
export function RequireFirstLoginComplete() {
  const { user } = useAuth();

  if (user?.firstLogin) return <Navigate to="/set-password" replace />;

  return <Outlet />;
}
