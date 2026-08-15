/**
 * Tolerant parser for jsonb columns.
 *
 * Postgres (via pg) returns jsonb columns as already-parsed JS
 * objects, while the legacy SQLite runtime stored them as JSON text.
 * A mapper that unconditionally JSON.parse()s a jsonb cell turns the
 * Postgres object into "[object Object]" and throws, so reads degrade
 * to defaults. parseJsonCell accepts either representation.
 */
export function parseJsonCell<T = Record<string, unknown>>(
  value: unknown,
  fallback: T
): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return (parsed ?? fallback) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
