import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-lg font-semibold text-content-primary">Page not found</p>
      <Link to="/" className="text-sm text-brand-600 underline underline-offset-2">
        Back to dashboard
      </Link>
    </div>
  );
}
