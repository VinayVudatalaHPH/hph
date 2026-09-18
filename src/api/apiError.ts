// Shape our custom RTK Query baseQuery rejects with — mirrors the backend's
// {status, message, data} envelope (see backend/app/responses.py) plus the
// one-off top-level `code` field abort() calls sometimes add (e.g.
// "temp_password_expired" on the login 403).
export interface ApiErrorShape {
  status: number;
  message: string;
  data: unknown;
  code?: string;
}

export type FieldErrors = Record<string, string[]>;

function hasErrorsData(data: unknown): data is { errors: FieldErrors } {
  return typeof data === "object" && data !== null && "errors" in data;
}

export function isApiError(error: unknown): error is ApiErrorShape {
  return typeof error === "object" && error !== null && "status" in error && "message" in error;
}

// Pulls the webargs/marshmallow 422 field-keyed error map out of an RTK
// Query mutation's `error` (typed loosely as `unknown` since RTK Query's own
// result type unions our ApiErrorShape with SerializedError). Keys match the
// backend's own request field names (see api/types.ts), so callers can pass
// this straight to Formik's setErrors after taking the first message per field.
export function getFieldErrors(error: unknown): FieldErrors | undefined {
  if (!isApiError(error) || !hasErrorsData(error.data)) return undefined;
  return error.data.errors;
}

export function toFormikErrors(fieldErrors: FieldErrors): Record<string, string> {
  return Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, messages[0]]));
}

// Best-effort human-readable message from anything an RTK Query mutation's
// `error` field might contain.
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
