import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-content-inverted shadow-[0_8px_20px_rgba(80,13,128,0.18)] hover:bg-brand-700 hover:shadow-[0_10px_24px_rgba(135,3,123,0.22)] focus-visible:outline-brand-600",
  secondary:
    "bg-surface text-hph-blue border border-border shadow-sm hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-brand-600",
  danger: "bg-hph-crimson text-content-inverted shadow-sm hover:bg-danger focus-visible:outline-danger",
  ghost: "bg-transparent text-content-secondary hover:bg-surface-inset focus-visible:outline-brand-600",
};

export function Button({ variant = "primary", isLoading, disabled, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold
        transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline
        focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
