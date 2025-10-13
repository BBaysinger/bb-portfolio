"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

type QueryParamValue = string | number | boolean;

function parseValue(value: string): QueryParamValue {
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  return isNaN(num) ? value : num;
}

function typeMatchesExpected<T extends QueryParamValue>(
  value: QueryParamValue,
  expected: T,
): value is T {
  return typeof value === typeof expected;
}

// Overloads
export default function useQueryParams(): Record<string, QueryParamValue>;
export default function useQueryParams<T extends QueryParamValue>(
  key: string,
  defaultValue: T,
): T;
export default function useQueryParams<T extends QueryParamValue>(
  key: string,
): T extends boolean ? boolean : T | undefined;

/**
 * useQueryParams (Next.js version)
 *
 * A custom hook for retrieving and parsing query parameters using `useSearchParams()` from
 * `next/navigation`. This hook provides flexible overloads:
 *
 * - No arguments: returns all query parameters as a key-value map
 * - With `key`: returns the typed value of that key (boolean, number, or string)
 * - With `key` and `defaultValue`: returns the value or the default if undefined,
 *   with type safety and runtime checks
 *
 * Useful for lightweight URL-driven state or feature toggles, such as experimental
 * mode switches in interactive components.
 *
 * ⚠️ Must be used inside a Client Component wrapped in a `<Suspense>` boundary
 * when used in a static export (`next export`) environment.
 *
 * @template T - The expected return type (boolean | number | string)
 * @param {string} [key] - The query parameter to retrieve
 * @param {T} [defaultValue] - A fallback value if the query param is missing
 * @returns {Record<string, QueryParamValue> | T | undefined}
 *
 * @example
 * const debug = useQueryParams("debug", false); // → boolean
 *
 */
export default function useQueryParams<
  T extends QueryParamValue = QueryParamValue,
>(
  key?: string,
  defaultValue?: T,
): Record<string, QueryParamValue> | T | undefined {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const result: Record<string, QueryParamValue> = {};

    for (const [k, value] of searchParams.entries()) {
      result[k] = parseValue(value);
    }

    if (key) {
      const value = result[key];

      if (value !== undefined) {
        if (
          defaultValue !== undefined &&
          !typeMatchesExpected(value, defaultValue)
        ) {
          throw new Error(
            `[useQueryParams] Type mismatch for "${key}": expected "${typeof defaultValue}", got "${typeof value}". Value: ${JSON.stringify(value)}`,
          );
        }

        return value as T;
      }

      if (defaultValue !== undefined) {
        return defaultValue;
      }

      // Only default booleans to false
      return false as unknown as T;
    }

    return result;
  }, [searchParams, key, defaultValue]);
}
