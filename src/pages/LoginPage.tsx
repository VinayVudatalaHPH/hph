import { useState } from "react";
import { Form, Formik } from "formik";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";

import { useLoginMutation } from "@/api/authApi";
import { isApiError } from "@/api/apiError";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";

interface LoginValues {
  email: string;
  password: string;
}

const initialValues: LoginValues = { email: "", password: "" };

// No `.email()` format check here: LoginSchema.email is a plain string on
// the backend (not fields.Email), deliberately — the seeded superadmin
// account's identifier is "superadmin", not an email address.
const validationSchema = Yup.object({
  email: Yup.string().required("Email is required"),
  password: Yup.string().required("Password is required"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const [login] = useLoginMutation();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginValues, helpers: { setSubmitting: (v: boolean) => void }) => {
    setFormError(null);
    const result = await login(values);

    if ("error" in result) {
      const err = result.error;
      if (isApiError(err) && err.status === 403 && err.code === "temp_password_expired") {
        // §5: no self-service recovery in this design — the admin-resend
        // flow (Users admin screen) is the only path back in.
        setFormError("Your temporary password has expired. Ask an admin to resend it.");
      } else if (isApiError(err)) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      helpers.setSubmitting(false);
      return;
    }

    navigate(result.data.user.firstLogin ? "/set-password" : "/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-card">
        <h1 className="text-xl font-semibold text-content-primary">Vitalyse Health</h1>
        <p className="mt-1 text-sm text-content-muted">Sign in to your account</p>

        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form className="mt-6 flex flex-col gap-4">
              {/* type="text", not "email" — the identifier isn't guaranteed to be
                  email-shaped (see the seeded superadmin account) and the browser's
                  native type="email" validation would otherwise block it. */}
              <TextField label="Email" name="email" type="text" autoComplete="username" autoFocus />
              <TextField label="Password" name="password" type="password" autoComplete="current-password" />

              {formError && (
                <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              )}

              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                Sign in
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
