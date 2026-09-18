import { Form, Formik, useField } from "formik";
import { useNavigate, useParams } from "react-router-dom";
import * as Yup from "yup";

import { useListFeaturesQuery } from "@/api/featuresApi";
import { useCreateRoleMutation, useGetRoleQuery, useListRoleTypesQuery, useUpdateRoleMutation } from "@/api/rolesApi";
import { getFieldErrors, toFormikErrors } from "@/api/apiError";
import type { Feature, RolePayload } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { CheckboxField, SelectField, TextField } from "@/components/ui/FormField";
import { ErrorState, LoadingState } from "@/components/ui/StateViews";

interface RoleFormValues {
  title: string;
  role_type_id: string;
  is_active: boolean;
  features: number[];
}

const validationSchema = Yup.object({
  title: Yup.string().required("Title is required").max(128),
  role_type_id: Yup.string().required("Role type is required"),
  is_active: Yup.boolean(),
  features: Yup.array().of(Yup.number().required()).defined(),
});

function FeatureCheckboxGroup({ features }: { features: Feature[] }) {
  const [field, , helpers] = useField<number[]>("features");

  const toggle = (id: number) => {
    helpers.setValue(field.value.includes(id) ? field.value.filter((v) => v !== id) : [...field.value, id]);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-content-secondary">Features</span>
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        {features.map((feature) => (
          <label key={feature.id} className="flex items-center gap-2 text-sm text-content-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
              checked={field.value.includes(feature.id)}
              onChange={() => toggle(feature.id)}
            />
            {feature.title}
            {!feature.active && <span className="text-xs text-content-muted">(inactive)</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

export function RoleFormPage() {
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

  const isLoading = isLoadingRoleTypes || isLoadingFeatures || (isEditMode && isLoadingRole);
  if (isLoading) return <LoadingState label="Loading…" />;
  if (isEditMode && isRoleError) return <ErrorState message="Couldn't load this role." onRetry={refetchRole} />;
  if (isEditMode && !role) return <ErrorState message="That role could not be found." />;

  const initialValues: RoleFormValues = {
    title: role?.title ?? "",
    role_type_id: role ? String(role.role_type_id) : "",
    is_active: role?.is_active ?? true,
    features: role?.features ?? [],
  };

  const handleSubmit = async (
    values: RoleFormValues,
    helpers: { setSubmitting: (v: boolean) => void; setErrors: (errors: Record<string, string>) => void },
  ) => {
    const payload: RolePayload = {
      title: values.title,
      role_type_id: Number(values.role_type_id),
      is_active: values.is_active,
      features: values.features,
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

    navigate("/admin/roles");
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-content-primary">{isEditMode ? "Edit role" : "New role"}</h1>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
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
              <Button type="button" variant="secondary" onClick={() => navigate("/admin/roles")}>
                Cancel
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
