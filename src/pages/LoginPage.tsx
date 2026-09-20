import { useState } from "react";
import { Form, Formik } from "formik";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";

import { apiSlice } from "@/api/apiSlice";
import { HphLogo } from "@/components/brand/HphLogo";
import { useLoginMutation } from "@/api/authApi";
import { isApiError } from "@/api/apiError";
import { useAppDispatch } from "@/app/hooks";
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
  const dispatch = useAppDispatch();
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

    // A login can follow an expired session or an account switch without a
    // full page reload. Drop every prior user-scoped response before the
    // authenticated routes mount for this user.
    dispatch(apiSlice.util.resetApiState());
    navigate(result.data.user.firstLogin ? "/set-password" : "/", { replace: true });
  };

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(22rem,0.9fr)_minmax(32rem,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-hph-blue px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-hph-magenta/35 blur-3xl" />
        <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-hph-orange/25 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <HphLogo className="h-12 w-12" />
          <span>
            <span className="block text-lg font-semibold">HPH Inhouse</span>
            <span className="block text-xs uppercase tracking-[0.2em] text-white/55">Operations</span>
          </span>
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Human Powered Health</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">Clarity for every shift, team, and outcome.</h1>
          <p className="mt-5 text-base leading-7 text-white/65">A focused workspace for coding performance, reporting, and team operations.</p>
        </div>
        <p className="relative text-xs text-white/40">Secure internal access</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <HphLogo />
            <span className="text-lg font-semibold text-hph-blue">HPH Inhouse</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hph-magenta">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-hph-blue">Sign in to your workspace</h1>
          <p className="mt-2 text-sm text-content-muted">Use your HPH Inhouse credentials to continue.</p>

          <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
            {({ isSubmitting }) => (
              <Form className="mt-8 flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
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
      </section>
    </div>
  );
}
