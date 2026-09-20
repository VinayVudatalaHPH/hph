import { useEffect, useRef, useState } from "react";

import { useListUsersFilteredQuery, useListUsersQuery } from "@/api/usersApi";
import { useAuth } from "@/features/auth/useAuth";

import { inputClasses } from "./FormField";

// GET /users returns everyone only to a caller holding `user_management`;
// anyone else gets back just their own profile (see backend/app/users/
// routes.py's `Users.get`). Both the Kairon and Manual Daily Records specs
// let any authenticated user filter/pick "a user" (e.g. resolving an
// analyst review), so a Manager with narrowly scoped user visibility may
// see a single-option list here — the
// numeric-id fallback below covers that case without needing a backend
// change.
function useLimitedUserListHint() {
  const { hasFeature } = useAuth();
  return !hasFeature("user_management");
}

interface UserSelectProps {
  value: number | null;
  onChange: (userId: number | null) => void;
  placeholder?: string;
  label?: string;
}

export function UserSelect({ value, onChange, placeholder = "Select a user…", label }: UserSelectProps) {
  const { data: users, isLoading } = useListUsersQuery("all");
  const limited = useLimitedUserListHint();

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-content-secondary">{label}</label>}
      <select
        className={inputClasses}
        value={value ?? ""}
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">{placeholder}</option>
        {(users ?? []).map((user) => (
          <option key={user.id} value={user.id}>
            {user.first_name} {user.last_name}
          </option>
        ))}
      </select>
      {limited && (
        <p className="text-xs text-content-muted">
          Only your own profile is listed here. Ask an admin to grant the Users feature to search everyone, or enter
          a user ID directly:
        </p>
      )}
      {limited && (
        <input
          type="number"
          min={1}
          className={inputClasses}
          placeholder="User ID"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        />
      )}
    </div>
  );
}

interface MultiUserSelectProps {
  value: number[];
  onChange: (userIds: number[]) => void;
  label?: string;
  size?: number;
  // When either is given, the list is scoped via GET /users/filter instead
  // of the "everyone the caller can see" list. `roleIds` is expected to be
  // pre-resolved (see useRoleIdsForRoleTypes) — pass [] to intentionally
  // show no options (e.g. while it's still resolving), never omit it to
  // mean "no role filter" if the caller meant to filter by role.
  projectIds?: number[];
  roleIds?: number[];
}

export function MultiUserSelect({ value, onChange, label, size = 5, projectIds, roleIds }: MultiUserSelectProps) {
  const filtering = projectIds !== undefined || roleIds !== undefined;
  const roleFilterExcludesEverything = roleIds !== undefined && roleIds.length === 0;

  const { data: allUsers, isLoading: isLoadingAll } = useListUsersQuery("all", { skip: filtering });
  const { data: filteredUsers, isLoading: isLoadingFiltered } = useListUsersFilteredQuery(
    { projectIds, roleIds },
    { skip: !filtering || roleFilterExcludesEverything },
  );

  const users = !filtering ? allUsers : roleFilterExcludesEverything ? [] : filteredUsers;
  const isLoading = !filtering ? isLoadingAll : roleFilterExcludesEverything ? false : isLoadingFiltered;
  const limited = useLimitedUserListHint();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggleUser(userId: number) {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  }

  const selectedUsers = (users ?? []).filter((user) => value.includes(user.id));
  const summary =
    selectedUsers.length === 0
      ? "Select…"
      : selectedUsers.length === 1
        ? `${selectedUsers[0].first_name} ${selectedUsers[0].last_name}`
        : `${selectedUsers.length} selected`;

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-content-secondary">{label}</label>}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          className={`${inputClasses} flex w-full items-center justify-between gap-2 text-left`}
          disabled={isLoading}
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={selectedUsers.length === 0 ? "text-content-muted" : "text-content-primary"}>
            {summary}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-content-muted transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && (
          <div
            className="absolute top-full z-10 mt-1 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-popover"
            style={{ maxHeight: `${size * 2.25}rem` }}
            role="listbox"
          >
            {(users ?? []).length === 0 && <p className="px-2 py-1.5 text-sm text-content-muted">No users found</p>}
            {(users ?? []).map((user) => (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-content-primary hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                  checked={value.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                />
                {user.first_name} {user.last_name}
              </label>
            ))}
          </div>
        )}
      </div>
      {!filtering && limited && (
        <p className="text-xs text-content-muted">
          Only your own profile is listed here. Ask an admin to grant the Users feature to search everyone.
        </p>
      )}
    </div>
  );
}
