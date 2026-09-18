import { Form, Formik } from "formik";
import * as Yup from "yup";

import { useListRoleTypesQuery, useUpdateSessionTimeoutMutation } from "@/api/rolesApi";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { ErrorState, LoadingState } from "@/components/ui/StateViews";

interface RowValues {
  session_timeout_minutes: number;
}

const validationSchema = Yup.object({
  session_timeout_minutes: Yup.number().required("Required").min(1, "Must be at least 1 minute"),
});

function SessionTimeoutRow({ roleTypeId, label, minutes }: { roleTypeId: number; label: string; minutes: number }) {
  const [updateSessionTimeout] = useUpdateSessionTimeoutMutation();

  const handleSubmit = async (values: RowValues, helpers: { setSubmitting: (v: boolean) => void }) => {
    // onQueryStarted (rolesApi.ts) already toasts the backend's message.
    await updateSessionTimeout({ roleTypeId, sessionTimeoutMinutes: values.session_timeout_minutes });
    helpers.setSubmitting(false);
  };

  return (
    <Formik
      initialValues={{ session_timeout_minutes: minutes }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, dirty }) => (
        <Form className="flex items-end gap-3">
          <span className="w-32 pb-2 text-sm text-content-primary">{label}</span>
          <div className="w-32">
            <TextField label="" name="session_timeout_minutes" type="number" min={1} />
          </div>
          <Button type="submit" variant="secondary" isLoading={isSubmitting} disabled={!dirty}>
            Save
          </Button>
        </Form>
      )}
    </Formik>
  );
}

// Superadmin-only sub-section (§9): session-timeout editor per RoleType.
export function SessionTimeoutSection() {
  const { data: roleTypes, isLoading, isError, refetch } = useListRoleTypesQuery();

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-base font-semibold text-content-primary">Session timeouts</h2>
      <p className="mt-1 text-sm text-content-muted">
        How long a session may stay idle before it expires, per role type.
      </p>

      {isLoading && <LoadingState label="Loading role types…" />}
      {isError && <ErrorState message="Couldn't load role types." onRetry={refetch} />}

      {roleTypes && (
        <div className="mt-4 flex flex-col gap-3">
          {roleTypes.map((roleType) => (
            <SessionTimeoutRow
              key={roleType.id}
              roleTypeId={roleType.id}
              label={roleType.label}
              minutes={roleType.sessionTimeoutMinutes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
