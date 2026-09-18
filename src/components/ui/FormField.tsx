import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useField } from "formik";

interface FieldShellProps {
  label: string;
  name: string;
  hint?: string;
  children: ReactNode;
}

function FieldShell({ label, name, hint, children }: FieldShellProps) {
  const [, meta] = useField(name);
  const errorId = `${name}-error`;
  const showError = meta.touched && Boolean(meta.error);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-content-secondary">
          {label}
        </label>
      )}
      {children}
      {hint && !showError && <p className="text-xs text-content-muted">{hint}</p>}
      {showError && (
        <p id={errorId} className="text-xs text-danger">
          {meta.error}
        </p>
      )}
    </div>
  );
}

const inputClasses =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-content-primary shadow-sm " +
  "focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-surface-inset " +
  "aria-[invalid=true]:border-danger";

type TextFieldProps = { label: string; name: string; hint?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name"
>;

export function TextField({ label, name, hint, ...rest }: TextFieldProps) {
  const [field, meta] = useField(name);
  return (
    <FieldShell label={label} name={name} hint={hint}>
      <input id={name} className={inputClasses} aria-invalid={meta.touched && Boolean(meta.error)} {...field} {...rest} />
    </FieldShell>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  hint?: string;
  placeholder?: string;
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name">;

export function SelectField({ label, name, hint, placeholder, children, ...rest }: SelectFieldProps) {
  const [field, meta] = useField(name);
  return (
    <FieldShell label={label} name={name} hint={hint}>
      <select id={name} className={inputClasses} aria-invalid={meta.touched && Boolean(meta.error)} {...field} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
    </FieldShell>
  );
}

type CheckboxFieldProps = { label: string; name: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "type"
>;

export function CheckboxField({ label, name, ...rest }: CheckboxFieldProps) {
  const [field] = useField({ name, type: "checkbox" });
  return (
    <label htmlFor={name} className="flex items-center gap-2 text-sm text-content-primary">
      <input
        id={name}
        type="checkbox"
        className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
        {...field}
        {...rest}
        checked={field.checked}
      />
      {label}
    </label>
  );
}
