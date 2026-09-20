import { useNavigate } from "react-router-dom";

import { apiSlice } from "@/api/apiSlice";
import { useLogoutMutation } from "@/api/authApi";
import { resetEncryptionKeyCache } from "@/api/encryptionKey";
import { useAppDispatch } from "@/app/hooks";

// Shared by the topbar's "Log out" and the account screen's current-session
// row — both revoke the caller's current session and clear the cookie.
// onQueryStarted (authApi.ts) already toasts the backend's message.
export function useLogoutHandler() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    const result = await logout();
    if ("error" in result) return;
    resetEncryptionKeyCache();
    // User-scoped report/team/admin queries share one RTK Query cache.
    // Clear it at the session boundary so the next account can never see
    // (or inherit an empty result from) the previous account's cache.
    dispatch(apiSlice.util.resetApiState());
    navigate("/login", { replace: true });
  };

  return { handleLogout, isLoggingOut: isLoading };
}
