import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { SetPasswordPage } from "@/pages/SetPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AccountSessionsPage } from "@/pages/account/AccountSessionsPage";
import { UsersListPage } from "@/pages/admin/users/UsersListPage";
import { UserFormPage } from "@/pages/admin/users/UserFormPage";
import { RolesListPage } from "@/pages/admin/roles/RolesListPage";
import { RoleFormPage } from "@/pages/admin/roles/RoleFormPage";
import { FeaturesListPage } from "@/pages/admin/features/FeaturesListPage";
import { FeatureFormPage } from "@/pages/admin/features/FeatureFormPage";

import { RequireAuth } from "./RequireAuth";
import { RequireFirstLoginComplete } from "./RequireFirstLoginComplete";
import { RequireFeature } from "./RequireFeature";
import { RequireRoleType } from "./RequireRoleType";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        {/* Deliberately NOT wrapped in RequireFirstLoginComplete — it's that guard's own destination. */}
        <Route path="/set-password" element={<SetPasswordPage />} />

        <Route element={<RequireFirstLoginComplete />}>
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={
                <RequireFeature codename="dashboard">
                  <DashboardPage />
                </RequireFeature>
              }
            />
            <Route path="/account" element={<AccountSessionsPage />} />

            <Route
              path="/admin/users"
              element={
                <RequireFeature codename="user_management">
                  <UsersListPage />
                </RequireFeature>
              }
            />
            <Route
              path="/admin/users/new"
              element={
                <RequireFeature codename="user_management">
                  <UserFormPage />
                </RequireFeature>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <RequireFeature codename="user_management">
                  <UserFormPage />
                </RequireFeature>
              }
            />

            <Route
              path="/admin/roles"
              element={
                <RequireFeature codename="role_management">
                  <RolesListPage />
                </RequireFeature>
              }
            />
            <Route
              path="/admin/roles/new"
              element={
                <RequireFeature codename="role_management">
                  <RoleFormPage />
                </RequireFeature>
              }
            />
            <Route
              path="/admin/roles/:id"
              element={
                <RequireFeature codename="role_management">
                  <RoleFormPage />
                </RequireFeature>
              }
            />

            <Route
              path="/admin/features"
              element={
                <RequireFeature codename="role_management">
                  <FeaturesListPage />
                </RequireFeature>
              }
            />
            <Route
              path="/admin/features/new"
              element={
                <RequireRoleType code="super_admin">
                  <FeatureFormPage />
                </RequireRoleType>
              }
            />
            <Route
              path="/admin/features/:id"
              element={
                <RequireRoleType code="super_admin">
                  <FeatureFormPage />
                </RequireRoleType>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
