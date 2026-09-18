export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Swagger UI is served off the API's root, not under /api — derive it from
// VITE_API_BASE_URL so it doesn't need its own env var.
export const SWAGGER_URL = `${API_BASE_URL.replace(/\/api\/?$/, "")}/swagger-ui`;
