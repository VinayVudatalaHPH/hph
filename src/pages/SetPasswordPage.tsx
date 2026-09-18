import { Form, Formik } from "formik";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";

import { useSetPasswordMutation } from "@/api/authApi";
import { getFieldErrors, toFormikErrors } from "@/api/apiError";
import type { SetPasswordPayload } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";

const initialValues: SetPasswordPayload = {
  current_password: "",
  new_password: "",
  new_password_confirm: "",
};

// Field names mirror SetPasswordSchema exactly (see api/types.ts) so a 422's
// field-keyed errors map straight onto Formik state with no translation.
const validationSchema = Yup.object({
  current_password: Yup.string().required("Current password is required"),
  new_password: Yup.string().required("New password is required").min(8, "Must be at least 8 characters"),
  new_password_confirm: Yup.string()
    .required("Please confirm your new password")
    .oneOf([Yup.ref("new_password")], "Passwords do not match"),
});

export function SetPasswordPage() {
  const navigate = useNavigate();
  const [setPassword] = useSetPasswordMutation();

  const handleSubmit = async (
    values: SetPasswordPayload,
    helpers: { setSubmitting: (v: boolean) => void; setErrors: (errors: Record<string, string>) => void },
  ) => {
    const result = await setPassword(values);

    if ("error" in result) {
      // The mutation's onQueryStarted already toasts the backend's message
      // (e.g. "Current password is incorrect."); field-level 422 errors
      // additionally map onto the form here.
      const fieldErrors = getFieldErrors(result.error);
      if (fieldErrors) helpers.setErrors(toFormikErrors(fieldErrors));
      helpers.setSubmitting(false);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-card">
        <h1 className="text-xl font-semibold text-content-primary">Set a new password</h1>
        <p className="mt-1 text-sm text-content-muted">
          This account is using a temporary password. Choose a new one to continue.
        </p>

        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form className="mt-6 flex flex-col gap-4">
              <TextField
                label="Current (temporary) password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                autoFocus
              />
              <TextField label="New password" name="new_password" type="password" autoComplete="new-password" />
              <TextField
                label="Confirm new password"
                name="new_password_confirm"
                type="password"
                autoComplete="new-password"
              />

              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                Set password
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
