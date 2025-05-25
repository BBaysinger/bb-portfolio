import { useMemo } from "react";
import { useLocation } from "react-router-dom";

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

export default function useQueryParams<
  T extends QueryParamValue = QueryParamValue,
>(
  key?: string,
  defaultValue?: T,
): Record<string, QueryParamValue> | T | undefined {
  const { search } = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(search);
    const result: Record<string, QueryParamValue> = {};

    for (const [k, value] of params.entries()) {
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
  }, [search, key, defaultValue]);
}
