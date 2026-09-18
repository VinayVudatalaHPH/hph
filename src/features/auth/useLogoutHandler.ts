import { useNavigate } from "react-router-dom";

import { useLogoutMutation } from "@/api/authApi";
import { resetEncryptionKeyCache } from "@/api/encryptionKey";

// Shared by the topbar's "Log out" and the account screen's current-session
// row — both revoke the caller's current session and clear the cookie.
// onQueryStarted (authApi.ts) already toasts the backend's message.
export function useLogoutHandler() {
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    const result = await logout();
    if ("error" in result) return;
    resetEncryptionKeyCache();
    navigate("/login", { replace: true });
  };

  return { handleLogout, isLoggingOut: isLoading };
}
