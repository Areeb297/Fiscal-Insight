import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, currenciesTable, ctcRulesTable, systemSettingsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  CreateCurrencyBody,
  UpdateCurrencyParams,
  UpdateCurrencyBody,
  DeleteCurrencyParams,
  CreateCtcRuleBody,
  UpdateCtcRuleParams,
  UpdateCtcRuleBody,
  DeleteCtcRuleParams,
  UpdateSystemSettingsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/currencies", async (_req, res): Promise<void> => {
  const currencies = await db.select().from(currenciesTable).orderBy(currenciesTable.code);
  res.json(currencies);
});

router.post("/admin/currencies", async (req, res): Promise<void> => {
  const parsed = CreateCurrencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [currency] = await db.insert(currenciesTable).values(parsed.data).returning();
  res.status(201).json(currency);
});

router.put("/admin/currencies/:id", async (req, res): Promise<void> => {
  const params = UpdateCurrencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCurrencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [currency] = await db.update(currenciesTable).set(parsed.data).where(eq(currenciesTable.id, params.data.id)).returning();
  if (!currency) {
    res.status(404).json({ error: "Currency not found" });
    return;
  }
  res.json(currency);
});

router.delete("/admin/currencies/:id", async (req, res): Promise<void> => {
  const params = DeleteCurrencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(currenciesTable).where(eq(currenciesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Currency not found" });
    return;
  }
  if (existing.isBase) {
    res.status(400).json({ error: "Cannot delete the base currency" });
    return;
  }
  await db.delete(currenciesTable).where(eq(currenciesTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/admin/ctc-rules", async (_req, res): Promise<void> => {
  const rules = await db.select().from(ctcRulesTable).orderBy(ctcRulesTable.countryName);
  res.json(rules);
});

router.post("/admin/ctc-rules", async (req, res): Promise<void> => {
  const parsed = CreateCtcRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db.insert(ctcRulesTable).values(parsed.data).returning();
  res.status(201).json(rule);
});

router.put("/admin/ctc-rules/:id", async (req, res): Promise<void> => {
  const params = UpdateCtcRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCtcRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db.update(ctcRulesTable).set(parsed.data).where(eq(ctcRulesTable.id, params.data.id)).returning();
  if (!rule) {
    res.status(404).json({ error: "CTC rule not found" });
    return;
  }
  res.json(rule);
});

router.delete("/admin/ctc-rules/:id", async (req, res): Promise<void> => {
  const params = DeleteCtcRuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [rule] = await db.delete(ctcRulesTable).where(eq(ctcRulesTable.id, params.data.id)).returning();
  if (!rule) {
    res.status(404).json({ error: "CTC rule not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(systemSettingsTable);
  if (!settings) {
    [settings] = await db.insert(systemSettingsTable).values({}).returning();
  }
  res.json(settings);
});

router.put("/admin/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSystemSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let [existing] = await db.select().from(systemSettingsTable);
  if (!existing) {
    [existing] = await db.insert(systemSettingsTable).values({}).returning();
  }
  const [settings] = await db.update(systemSettingsTable).set(parsed.data).where(eq(systemSettingsTable.id, existing.id)).returning();
  res.json(settings);
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  try {
    const list = await clerkClient.users.getUserList({ limit: 200, orderBy: "-created_at" });
    const users = list.data.map((u) => ({
      id: u.id,
      email: u.primaryEmailAddress?.emailAddress ?? null,
      firstName: u.firstName,
      lastName: u.lastName,
      role: ((u.publicMetadata as Record<string, unknown> | undefined)?.["role"] === "admin" ? "admin" : "user") as "admin" | "user",
      createdAt: u.createdAt,
    }));
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to list users" });
  }
});

router.put("/admin/users/:id/role", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const id = req.params["id"];
  const role = req.body?.role;
  if (!id || (role !== "admin" && role !== "user")) {
    res.status(400).json({ error: "role must be 'admin' or 'user'" });
    return;
  }
  try {
    await clerkClient.users.updateUser(id, { publicMetadata: { role } });
    res.json({ id, role });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to update role" });
  }
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { email, password, firstName, lastName, role } = req.body ?? {};
  if (!email || !password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Email and a password of at least 8 characters are required" });
    return;
  }
  try {
    const created = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      skipPasswordChecks: true,
      publicMetadata: role === "admin" ? { role: "admin" } : {},
    });
    res.status(201).json({
      id: created.id,
      email: created.primaryEmailAddress?.emailAddress ?? null,
      firstName: created.firstName,
      lastName: created.lastName,
      role: role === "admin" ? "admin" : "user",
    });
  } catch (e: any) {
    const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || "Failed to create user";
    res.status(400).json({ error: msg });
  }
});

router.post("/admin/users/:id/reset-password", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const id = req.params["id"];
  const { password, signOutOtherSessions } = req.body ?? {};
  if (!id || !password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  try {
    await clerkClient.users.updateUser(id, {
      password,
      skipPasswordChecks: true,
      signOutOfOtherSessions: signOutOtherSessions !== false,
    });
    res.json({ id, ok: true });
  } catch (e: any) {
    const msg = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || "Failed to reset password";
    res.status(400).json({ error: msg });
  }
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  if (id === ctx.userId) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }
  try {
    await clerkClient.users.deleteUser(id);
    res.sendStatus(204);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to delete user" });
  }
});

export default router;
