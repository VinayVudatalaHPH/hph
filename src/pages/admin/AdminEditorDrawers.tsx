import { useNavigate, useParams } from "react-router-dom";

import { Drawer } from "@/components/ui/Drawer";

import { FeatureFormPage } from "./features/FeatureFormPage";
import { FeaturesListPage } from "./features/FeaturesListPage";
import { RoleFormPage } from "./roles/RoleFormPage";
import { RolesListPage } from "./roles/RolesListPage";

export function RoleEditorDrawerPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const close = () => navigate("/admin/roles");

  return (
    <>
      <RolesListPage />
      <Drawer
        open
        onClose={close}
        title={id ? "Edit role" : "New role"}
        description="Set the role profile and choose Read or Write access for each feature."
        widthClass="max-w-2xl"
      >
        <RoleFormPage embedded onDone={close} />
      </Drawer>
    </>
  );
}

export function FeatureEditorDrawerPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const close = () => navigate("/admin/features");

  return (
    <>
      <FeaturesListPage />
      <Drawer
        open
        onClose={close}
        title={id ? "Edit feature" : "New feature"}
        description="Define the feature that can be assigned to role profiles."
        widthClass="max-w-lg"
      >
        <FeatureFormPage embedded onDone={close} />
      </Drawer>
    </>
  );
}
