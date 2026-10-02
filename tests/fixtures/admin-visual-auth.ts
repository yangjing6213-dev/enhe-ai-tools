if (
  process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1" ||
  process.env.ENHE_ADMIN_VISUAL_FIXTURE_HOST !== "127.0.0.1" ||
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.DATABASE_URL?.trim())
) {
  throw new Error("The admin visual auth fixture is available only in local database-free development.");
}

export async function requireAdmin() {
  return {
    id: "local-visual-admin",
    email: "admin@localhost.invalid",
    phone: null,
    nickname: "Local visual fixture",
    avatar: null,
    role: "admin" as const,
    status: "active" as const,
    createdAt: new Date(0),
    newsletterEmail: null,
    acceptEmailUpdates: false
  };
}

export async function getCurrentUser() {
  return requireAdmin();
}

export async function getHeaderUserSnapshot() {
  return { email: "admin@localhost.invalid", nickname: "Local visual fixture", role: "admin" as const };
}

export async function hashPassword() {
  throw new Error("Password operations are disabled in the admin visual fixture.");
}

// Shared server actions are imported by read-only admin pages. Keep their
// imports resolvable while refusing every authentication or user operation.
export async function assertLoginNotLimited() {
  throw new Error("Login operations are disabled in the admin visual fixture.");
}

export async function recordLoginAttempt() {
  throw new Error("Login operations are disabled in the admin visual fixture.");
}

export async function requireUser() {
  throw new Error("User operations are disabled in the admin visual fixture.");
}

export async function signInUser() {
  throw new Error("Login operations are disabled in the admin visual fixture.");
}

export async function signOutUser() {
  throw new Error("Logout operations are disabled in the admin visual fixture.");
}

export async function verifyPassword() {
  throw new Error("Password operations are disabled in the admin visual fixture.");
}
