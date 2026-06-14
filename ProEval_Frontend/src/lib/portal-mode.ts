export const TEST_USER_EMAIL = "test@proeval.ai";

export function isTestUserEmail(email?: string | null): boolean {
  return (email || "").trim().toLowerCase() === TEST_USER_EMAIL;
}

export function getStoredUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("current_user_email");
}

export function isStoredTestUser(): boolean {
  return isTestUserEmail(getStoredUserEmail());
}
