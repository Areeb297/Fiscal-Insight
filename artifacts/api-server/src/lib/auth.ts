import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

const JWT_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-prod";
const ADMIN_EMAILS_DEFAULT = "areeb.shafqat@gmail.com,areeb.shafqat@ebttikar.com";

export function adminEmails(): string[] {
  return (process.env["ADMIN_EMAILS"] || ADMIN_EMAILS_DEFAULT)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export interface AuthContext {
  userId: string;
  email: string;
  role: "admin" | "user";
}

export function signToken(ctx: AuthContext): string {
  return jwt.sign(ctx, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthContext | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthContext;
  } catch {
    return null;
  }
}

export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return verifyToken(header.slice(7));
}

export async function requireAuth(
  req: Request,
  res: Response,
): Promise<AuthContext | null> {
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
): Promise<AuthContext | null> {
  const ctx = await requireAuth(req, res);
  if (!ctx) return null;
  if (ctx.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return ctx;
}
