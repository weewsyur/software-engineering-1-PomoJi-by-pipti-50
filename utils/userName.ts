export interface UserNameFields {
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  suffix: string | null;
}

export const EMPTY_USER_NAME_FIELDS: UserNameFields = {
  firstName: null,
  lastName: null,
  middleName: null,
  suffix: null,
};

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readUserNameFields(
  data: Record<string, unknown>,
): UserNameFields {
  return {
    firstName: nullableString(data.firstName),
    lastName: nullableString(data.lastName),
    middleName: nullableString(data.middleName),
    suffix: nullableString(data.suffix),
  };
}

export function formatUserName(
  fields: UserNameFields,
  legacyName?: string | null,
): string {
  const structuredName = [
    fields.firstName,
    fields.middleName,
    fields.lastName,
    fields.suffix,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return structuredName || legacyName?.trim() || "";
}

export function getPublicUsername(
  value: string | null | undefined,
  email: string | null | undefined,
): string {
  const username = value?.trim() ?? "";
  if (!username || username.includes("@") || username.toLowerCase() === email?.trim().toLowerCase()) {
    return "User";
  }
  return username;
}
