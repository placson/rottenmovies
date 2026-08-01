const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const DEFAULT_LOCAL_USER_ID = "local-dev-user";

export function isLocalAuthBypassed(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    TRUE_VALUES.has(String(process.env.LOCAL_AUTH_BYPASS ?? "").toLowerCase())
  );
}

export function getLocalAuthUserId(): string {
  return process.env.LOCAL_AUTH_USER_ID?.trim() || DEFAULT_LOCAL_USER_ID;
}
