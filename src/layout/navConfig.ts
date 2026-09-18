export interface NavItem {
  label: string;
  to: string;
  feature: string;
}

// "Login Hours" is deliberately absent — Phase 1.5 hasn't shipped a backend
// yet (see PHASE2_FRONTEND_FOUNDATION.md §6).
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", feature: "dashboard" },
  { label: "Users", to: "/admin/users", feature: "user_management" },
  { label: "Roles & Features", to: "/admin/roles", feature: "role_management" },
];
