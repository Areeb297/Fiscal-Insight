import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response } from "express";

const ADMIN_EMAILS_DEFAULT = "areeb.shafqat@ebttikar.com,khalid@ebttikar.com";

function adminEmails(): string[] {
  return (process.env["ADMIN_EMAILS"] || ADMIN_EMAILS_DEFAULT)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAuthContext(
  req: Request,
): Promise<{ userId: string; email: string | null; role: "admin" | "user" } | null> {
  const auth = getAuth(req);
  if (!auth.userId) return null;

  let role: "admin" | "user" = "user";
  let email: string | null = null;

  try {
    const user = await clerkClient.users.getUser(auth.userId);
    email = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
    const metaRole = (user.publicMetadata as Record<string, unknown> | undefined)?.["role"];
    if (metaRole === "admin") role = "admin";
    if (email && adminEmails().includes(email)) role = "admin";
  } catch {
    // best-effort: keep defaults
  }

  return { userId: auth.userId, email, role };
}

export async function requireAuth(
  req: Request,
  res: Response,
): Promise<{ userId: string; email: string | null; role: "admin" | "user" } | null> {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return ctx;
}

export async function requireAdmin(
  req: Request,
  res: Response,
): Promise<{ userId: string; email: string | null; role: "admin" | "user" } | null> {
  const ctx = await requireAuth(req, res);
  if (!ctx) return null;
  if (ctx.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return ctx;
}
