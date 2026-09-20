import { Form, Formik } from "formik";
import { useNavigate, useParams } from "react-router-dom";
import * as Yup from "yup";

import { useCreateFeatureMutation, useListFeaturesQuery, useUpdateFeatureMutation } from "@/api/featuresApi";
import { getFieldErrors, toFormikErrors } from "@/api/apiError";
import type { FeaturePayload } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/FormField";
import { ErrorState, LoadingState } from "@/components/ui/StateViews";

const validationSchema = Yup.object({
  codename: Yup.string().required("Codename is required").max(64),
  title: Yup.string().required("Title is required").max(128),
  description: Yup.string().nullable(),
  active: Yup.boolean(),
});

export function FeatureFormPage({ embedded = false, onDone }: { embedded?: boolean; onDone?: () => void } = {}) {
  const { id } = useParams<{ id: string }>();
  const featureId = id ? Number(id) : undefined;
  const isEditMode = featureId !== undefined;

  // The backend never grew a GET /features/<id> — features are only ever
  // fetched as a list, so an edit form derives its initial values from the
  // already-cached list query rather than a nonexistent detail endpoint.
  const { data: features, isLoading, isError, refetch } = useListFeaturesQuery(undefined, { skip: !isEditMode });
  const feature = features?.find((f) => f.id === featureId);

  const [createFeature] = useCreateFeatureMutation();
  const [updateFeature] = useUpdateFeatureMutation();
  const navigate = useNavigate();
  const closeForm = onDone ?? (() => navigate("/admin/features"));

  if (isEditMode && isLoading) return <LoadingState label="Loading feature…" />;
  if (isEditMode && isError) return <ErrorState message="Couldn't load features." onRetry={refetch} />;
  if (isEditMode && !feature) return <ErrorState message="That feature could not be found." />;

  const initialValues: FeaturePayload = {
    codename: feature?.codename ?? "",
    title: feature?.title ?? "",
    description: feature?.description ?? "",
    active: feature?.active ?? true,
  };

  const handleSubmit = async (
    values: FeaturePayload,
    helpers: { setSubmitting: (v: boolean) => void; setErrors: (errors: Record<string, string>) => void },
  ) => {
    const result = isEditMode
      ? await updateFeature({ id: featureId, body: values })
      : await createFeature(values);

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
      {!embedded && <h1 className="text-lg font-semibold text-content-primary">{isEditMode ? "Edit feature" : "New feature"}</h1>}

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className={embedded ? "flex flex-col gap-4" : "mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"}>
            <TextField label="Codename" name="codename" placeholder="e.g. user_management" />
            <TextField label="Title" name="title" />
            <TextField label="Description" name="description" />
            <CheckboxField label="Active" name="active" />

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
