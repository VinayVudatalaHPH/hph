// Builds a query string for list/filter endpoints that take repeated params
// for an array value (e.g. ?userIds=3&userIds=7), matching how the backend's
// webargs/marshmallow query schemas expect `fields.List(...)` to arrive —
// see kairon/schemas.py's KaironChartQuerySchema and
// manual_daily_records/schemas.py's ManualDailyRecordQuerySchema.
type QueryParamValue = string | number | boolean | Array<string | number> | null | undefined;

export function buildQueryString<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as Array<[string, QueryParamValue]>) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
