import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/features/auth/useAuth";
import { useLogoutHandler } from "@/features/auth/useLogoutHandler";
import { SWAGGER_URL } from "@/lib/env";

import { NAV_ITEMS } from "./navConfig";
import { SessionFooter } from "./SessionFooter";

export function AppShell() {
  const { user, hasFeature } = useAuth();
  const { handleLogout, isLoggingOut } = useLogoutHandler();

  const visibleNavItems = NAV_ITEMS.filter((item) => hasFeature(item.feature));

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <aside className="flex w-60 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5">
          <span className="text-lg font-semibold text-content-primary">Vitalyse Health</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {visibleNavItems.length === 0 && (
            <p className="px-3 py-2 text-xs text-content-muted">No sections available for your role.</p>
          )}
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-content-secondary hover:bg-surface-inset hover:text-content-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4">
          <a
            href={SWAGGER_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-content-muted underline underline-offset-2 hover:text-content-secondary"
          >
            API Docs (Swagger)
          </a>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div />
          <div className="flex items-center gap-4">
            <NavLink to="/account" className="text-right text-sm hover:underline">
              <span className="block font-medium text-content-primary">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-xs text-content-muted">{user?.role.title}</span>
            </NavLink>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-content-secondary
                hover:bg-surface-inset disabled:opacity-60"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>

        <SessionFooter />
      </div>
    </div>
  );
}
