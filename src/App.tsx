import { useWhoamiQuery } from "@/api/authApi";
import { LoadingState } from "@/components/ui/StateViews";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AppRoutes } from "@/routes/AppRoutes";

export default function App() {
  // Runs once on mount and restores "who's logged in" from the session
  // cookie. Nothing else renders its real content until this resolves —
  // otherwise a valid-session refresh would flash the login page first.
  const { isLoading } = useWhoamiQuery();

  return (
    <>
      {isLoading ? (
        <div className="flex min-h-screen items-center justify-center bg-surface-muted">
          <LoadingState label="Loading HPH Inhouse…" />
        </div>
      ) : (
        <AppRoutes />
      )}
      <ToastContainer />
    </>
  );
}
