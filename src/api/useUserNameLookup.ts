import { useMemo } from "react";

import { useListUsersQuery } from "./usersApi";

// Kairon upload batches and manual daily records only ever carry a numeric
// user id on the wire (uploadedById, userId, reviewedById, …) — this turns
// one into a display name using whatever GET /users happens to return for
// the current viewer (everyone, or just themselves if they lack
// user_management — see UserSelect.tsx's note). Falls back to "User #<id>"
// for an id outside that set rather than hiding the row.
export function useUserNameLookup() {
  const { data: users } = useListUsersQuery("all");

  return useMemo(() => {
    const names = new Map<number, string>();
    for (const user of users ?? []) {
      names.set(user.id, `${user.first_name} ${user.last_name}`);
    }
    return (userId: number | null | undefined): string => {
      if (userId === null || userId === undefined) return "—";
      return names.get(userId) ?? `User #${userId}`;
    };
  }, [users]);
}
