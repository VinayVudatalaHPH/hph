import { Form, Formik, useField } from "formik";
import { useNavigate, useParams } from "react-router-dom";
import * as Yup from "yup";

import { useListFeaturesQuery } from "@/api/featuresApi";
import { useCreateRoleMutation, useGetRoleQuery, useListRoleTypesQuery, useUpdateRoleMutation } from "@/api/rolesApi";
import { getFieldErrors, toFormikErrors } from "@/api/apiError";
import type { Feature, RoleFeaturePermission, RolePayload } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { CheckboxField, SelectField, TextField } from "@/components/ui/FormField";
import { ErrorState, LoadingState } from "@/components/ui/StateViews";

interface RoleFormValues {
  title: string;
  role_type_id: string;
  is_active: boolean;
  feature_permissions: RoleFeaturePermission[];
}

const validationSchema = Yup.object({
  title: Yup.string().required("Title is required").max(128),
  role_type_id: Yup.string().required("Role type is required"),
  is_active: Yup.boolean(),
  feature_permissions: Yup.array()
    .of(
      Yup.object({
        feature_id: Yup.number().required(),
        can_read: Yup.boolean().required(),
        can_write: Yup.boolean().required(),
      }),
    )
    .defined(),
});

function FeatureCheckboxGroup({ features }: { features: Feature[] }) {
  const [field, , helpers] = useField<RoleFeaturePermission[]>("feature_permissions");

  const permissionFor = (id: number) => field.value.find((permission) => permission.feature_id === id);

  const toggleFeature = (id: number) => {
    const enabled = Boolean(permissionFor(id));
    helpers.setValue(
      enabled
        ? field.value.filter((permission) => permission.feature_id !== id)
        : [...field.value, { feature_id: id, can_read: true, can_write: false }],
    );
  };

  const setAccess = (id: number, access: "read" | "write", enabled: boolean) => {
    helpers.setValue(
      field.value.map((permission) => {
        if (permission.feature_id !== id) return permission;
        if (access === "write") {
          return { ...permission, can_read: enabled || permission.can_read, can_write: enabled };
        }
        return { ...permission, can_read: enabled, can_write: enabled ? permission.can_write : false };
      }),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-content-secondary">Features</span>
      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-[1fr_5rem_5rem] gap-3 border-b border-border bg-surface-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
          <span>Feature</span>
          <span className="text-center">Read</span>
          <span className="text-center">Write</span>
        </div>
        {features.map((feature) => {
          const permission = permissionFor(feature.id);
          const enabled = Boolean(permission);
          return (
            <div key={feature.id} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
              <label className="flex min-w-0 items-center gap-2 text-sm text-content-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                  checked={enabled}
                  onChange={() => toggleFeature(feature.id)}
                />
                <span className="truncate">{feature.title}</span>
                {!feature.active && <span className="text-xs text-content-muted">(inactive)</span>}
              </label>
              <label className="flex justify-center" aria-label={`Read ${feature.title}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-hph-blue focus:ring-brand-500 disabled:opacity-30"
                  checked={permission?.can_read ?? false}
                  disabled={!enabled}
                  onChange={(event) => setAccess(feature.id, "read", event.target.checked)}
                />
              </label>
              <label className="flex justify-center" aria-label={`Write ${feature.title}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-hph-magenta focus:ring-brand-500 disabled:opacity-30"
                  checked={permission?.can_write ?? false}
                  disabled={!enabled}
                  onChange={(event) => setAccess(feature.id, "write", event.target.checked)}
                />
              </label>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-content-muted">Write access includes read access. Read-only roles can open the feature but won't see modification actions.</p>
    </div>
  );
}

export function RoleFormPage({ embedded = false, onDone }: { embedded?: boolean; onDone?: () => void } = {}) {
  const { id } = useParams<{ id: string }>();
  const roleId = id ? Number(id) : undefined;
  const isEditMode = roleId !== undefined;

  const {
    data: role,
    isLoading: isLoadingRole,
    isError: isRoleError,
    refetch: refetchRole,
  } = useGetRoleQuery(roleId as number, { skip: !isEditMode });
  const { data: roleTypes, isLoading: isLoadingRoleTypes } = useListRoleTypesQuery();
  const { data: features, isLoading: isLoadingFeatures } = useListFeaturesQuery();

  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const navigate = useNavigate();
  const closeForm = onDone ?? (() => navigate("/admin/roles"));

  const isLoading = isLoadingRoleTypes || isLoadingFeatures || (isEditMode && isLoadingRole);
  if (isLoading) return <LoadingState label="Loading…" />;
  if (isEditMode && isRoleError) return <ErrorState message="Couldn't load this role." onRetry={refetchRole} />;
  if (isEditMode && !role) return <ErrorState message="That role could not be found." />;

  const initialValues: RoleFormValues = {
    title: role?.title ?? "",
    role_type_id: role ? String(role.role_type_id) : "",
    is_active: role?.is_active ?? true,
    feature_permissions:
      role?.feature_permissions ??
      (role?.features ?? []).map((featureId) => ({ feature_id: featureId, can_read: true, can_write: true })),
  };

  const handleSubmit = async (
    values: RoleFormValues,
    helpers: { setSubmitting: (v: boolean) => void; setErrors: (errors: Record<string, string>) => void },
  ) => {
    const payload: RolePayload = {
      title: values.title,
      role_type_id: Number(values.role_type_id),
      is_active: values.is_active,
      features: values.feature_permissions.map((permission) => permission.feature_id),
      feature_permissions: values.feature_permissions,
    };

    const result = isEditMode ? await updateRole({ id: roleId as number, body: payload }) : await createRole(payload);

    if ("error" in result) {
      // onQueryStarted already toasted the backend's message; field-level
      // 422 errors additionally map onto the form here.
      const fieldErrors = getFieldErrors(result.error);
      if (fieldErrors) helpers.setErrors(toFormikErrors(fieldErrors));
      helpers.setSubmitting(false);
      return;
    }

    closeForm();
  };

  return (
    <div className={embedded ? "" : "max-w-lg"}>
      {!embedded && <h1 className="text-lg font-semibold text-content-primary">{isEditMode ? "Edit role" : "New role"}</h1>}

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className={embedded ? "flex flex-col gap-4" : "mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"}>
            <TextField label="Title" name="title" />
            <SelectField label="Role type" name="role_type_id" placeholder="Select a role type…">
              {roleTypes?.map((roleType) => (
                <option key={roleType.id} value={roleType.id}>
                  {roleType.label}
                </option>
              ))}
            </SelectField>
            <CheckboxField label="Active" name="is_active" />
            <FeatureCheckboxGroup features={features ?? []} />

            <div className="mt-2 flex gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
