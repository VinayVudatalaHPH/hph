import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/useAuth";
import { LoadingState } from "@/components/ui/StateViews";

// Renders children only once `isLoading` is false and `user` is set;
// otherwise redirects to /login. App.tsx already gates the whole app on the
// initial whoami resolving, so the loading branch here is a safety net, not
// the primary gate.
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
