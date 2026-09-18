// Domain types mirror the actual wire format of backend/app/**/schemas.py
// field-for-field (including casing) rather than normalizing everything to
// camelCase. The backend is inconsistent here — UserProfileSchema/RoleType
// use explicit `data_key`s (camelCase), but the admin UserSchema/RoleSchema
// have none, so those responses are genuinely snake_case on the wire. Mirroring
// it exactly means `ApiError.data.errors` keys line up with these same field
// names, so validation errors map onto Formik fields with no translation step.

export type RoleTypeCode = "super_admin" | "admin" | "manager" | "lead" | "employee";

// Nested "role" shape (RoleProfileSchema) — used both inside the auth user
// (login/whoami/set-password) and inside the admin User resource. Always
// camelCase, regardless of which parent embeds it.
export interface RoleProfile {
  id: number;
  title: string;
  roleType: RoleTypeCode;
  sessionTimeoutMinutes: number;
  features: string[]; // active feature codenames the role grants
}

// GET /sessions/whoami, POST /sessions/login, POST /users/set-password
// all respond with { user: AuthUser } (UserProfileSchema) — camelCase.
export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  empId: string;
  firstLogin: boolean;
  isActive: boolean;
  project: string | null;
  role: RoleProfile;
}

// GET/POST/PATCH /users, /users/active, /users/inactive, /users/<id>,
// /users/<id>/resend-temporary-password (UserSchema) — snake_case.
export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  emp_id: string;
  role_id: number;
  role: RoleProfile;
  project_id: number | null;
  first_login: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// POST /users body, and PATCH /users/<id> body (all fields optional there).
export interface UserCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  emp_id: string;
  role_id: number;
  project_id?: number | null;
}
export type UserUpdatePayload = Partial<UserCreatePayload>;

// GET/POST/PATCH /roles (RoleSchema) — snake_case; `features` is feature ids.
export interface AdminRole {
  id: number;
  title: string;
  role_type_id: number;
  is_active: boolean;
  features: number[];
  created_at: string;
  updated_at: string;
}

export interface RolePayload {
  title: string;
  role_type_id: number;
  is_active?: boolean;
  features?: number[];
}

// GET /role-types (RoleTypeSchema) — camelCase, read-only fixed seed data.
export interface RoleType {
  id: number;
  code: RoleTypeCode;
  label: string;
  hierarchyRank: number;
  sessionTimeoutMinutes: number;
}

// GET/PATCH /role-types/<id>/session-timeout (SessionTimeoutSchema).
export interface SessionTimeout {
  roleTypeId: number;
  sessionTimeoutMinutes: number;
}

// GET/POST/PATCH/DELETE /features (FeatureSchema).
export interface Feature {
  id: number;
  codename: string;
  title: string;
  description: string | null;
  active: boolean;
}

export interface FeaturePayload {
  codename: string;
  title: string;
  description?: string | null;
  active?: boolean;
}

// GET /sessions/me (SessionSchema) — camelCase.
export interface SessionRow {
  id: number;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SetPasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

// Projects are fixed seed data, same in spirit as RoleType, but Phase 1 never
// grew a GET /projects endpoint (§0 of PHASE2_FRONTEND_FOUNDATION.md only
// added whoami/role-types/session-delete) — so unlike RoleType this list
// isn't fetched, it's hardcoded to match backend/migrations/versions/
// b651d55f60e9_seed_projects.py.
export const PROJECTS: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: "RCM" },
  { id: 2, name: "CODING" },
];

export const PROJECT_REQUIRED_ROLE_TYPES: ReadonlySet<RoleTypeCode> = new Set(["manager", "lead", "employee"]);
export const PROJECT_FORBIDDEN_ROLE_TYPES: ReadonlySet<RoleTypeCode> = new Set(["admin", "super_admin"]);
