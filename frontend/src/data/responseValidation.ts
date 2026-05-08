export const requireResponseData = <T>(payload: unknown, label: string): T => {
  if (!payload || typeof payload !== "object") {
    throw new Error(`${label} response was not an object.`);
  }

  const response = payload as { success?: boolean; data?: unknown };
  if (!response.success || !response.data) {
    throw new Error(`${label} response did not include data.`);
  }

  return response.data as T;
};

export const requireTrimmedString = (
  value: unknown,
  fieldName: string,
): string => {
  if (typeof value !== "string") {
    throw new Error(`Response missing ${fieldName}.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Response missing ${fieldName}.`);
  }

  return trimmed;
};

export const requireArray = <T>(value: unknown, fieldName: string): T[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Response missing ${fieldName}.`);
  }

  return value as T[];
};
