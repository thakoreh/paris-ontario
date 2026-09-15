export type AuthMode =
  | "signup"
  | "login"
  | "forgot-password"
  | "reset-password"
  | string;

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

export function authErrorMessage(mode: AuthMode, error: unknown) {
  const raw = errorText(error);
  const normalized = raw.toLowerCase();

  if (
    mode === "signup" &&
    /(sending|send|deliver|delivery|smtp|email).*(confirmation|email)|confirmation.*(email|smtp)|smtp/.test(
      normalized,
    )
  ) {
    return "We couldn’t send the confirmation email. Email delivery needs to be configured for this project; please try again later.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox for the confirmation link.";
  }
  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid password")
  ) {
    return "The email or password is incorrect. Try again or reset your password.";
  }
  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered")
  ) {
    return "An account with this email may already exist. Try signing in or resetting your password.";
  }
  if (
    normalized.includes("signups are disabled") ||
    normalized.includes("signup is disabled")
  ) {
    return "Account creation is temporarily unavailable. Please try again later.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (mode === "signup") return raw || "We couldn’t create your account. Please try again.";
  if (mode === "forgot-password") {
    return "We couldn’t send the reset link. Please try again later.";
  }
  if (mode === "reset-password") {
    return "We couldn’t update your password. Please try again.";
  }
  return raw || "We couldn’t sign you in. Please try again.";
}
