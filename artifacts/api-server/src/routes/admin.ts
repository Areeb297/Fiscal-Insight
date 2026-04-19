import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, currenciesTable, ctcRulesTable, systemSettingsTable, usersTable } from "@workspace/db";
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
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [currency] = await db.insert(currenciesTable).values(parsed.data).returning();
  res.status(201).json(currency);
});

router.put("/admin/currencies/:id", async (req, res): Promise<void> => {
  const params = UpdateCurrencyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCurrencyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [currency] = await db.update(currenciesTable).set(parsed.data).where(eq(currenciesTable.id, params.data.id)).returning();
  if (!currency) { res.status(404).json({ error: "Currency not found" }); return; }
  res.json(currency);
});

router.delete("/admin/currencies/:id", async (req, res): Promise<void> => {
  const params = DeleteCurrencyParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [existing] = await db.select().from(currenciesTable).where(eq(currenciesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Currency not found" }); return; }
  if (existing.isBase) { res.status(400).json({ error: "Cannot delete the base currency" }); return; }
  await db.delete(currenciesTable).where(eq(currenciesTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/admin/ctc-rules", async (_req, res): Promise<void> => {
  const rules = await db.select().from(ctcRulesTable).orderBy(ctcRulesTable.countryName);
  res.json(rules);
});

router.post("/admin/ctc-rules", async (req, res): Promise<void> => {
  const parsed = CreateCtcRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rule] = await db.insert(ctcRulesTable).values(parsed.data).returning();
  res.status(201).json(rule);
});

router.put("/admin/ctc-rules/:id", async (req, res): Promise<void> => {
  const params = UpdateCtcRuleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCtcRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rule] = await db.update(ctcRulesTable).set(parsed.data).where(eq(ctcRulesTable.id, params.data.id)).returning();
  if (!rule) { res.status(404).json({ error: "CTC rule not found" }); return; }
  res.json(rule);
});

router.delete("/admin/ctc-rules/:id", async (req, res): Promise<void> => {
  const params = DeleteCtcRuleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [rule] = await db.delete(ctcRulesTable).where(eq(ctcRulesTable.id, params.data.id)).returning();
  if (!rule) { res.status(404).json({ error: "CTC rule not found" }); return; }
  res.sendStatus(204);
});

router.get("/admin/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(systemSettingsTable);
  if (!settings) { [settings] = await db.insert(systemSettingsTable).values({}).returning(); }
  res.json(settings);
});

router.put("/admin/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSystemSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  let [existing] = await db.select().from(systemSettingsTable);
  if (!existing) { [existing] = await db.insert(systemSettingsTable).values({}).returning(); }
  const [settings] = await db.update(systemSettingsTable).set(parsed.data).where(eq(systemSettingsTable.id, existing.id)).returning();
  res.json(settings);
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const list = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(list);
});

router.put("/admin/users/:id/role", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const id = req.params["id"];
  const role = req.body?.role;
  if (!id || (role !== "admin" && role !== "user")) {
    res.status(400).json({ error: "role must be 'admin' or 'user'" }); return;
  }
  const [user] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id, role });
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { email, password, firstName, lastName, role } = req.body ?? {};
  if (!email || !password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Email and a password of at least 8 characters are required" }); return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) { res.status(400).json({ error: "Email already in use" }); return; }
  const passwordHash = await bcrypt.hash(password, 12);
  const [created] = await db.insert(usersTable).values({
    email: email.toLowerCase(), passwordHash,
    firstName: firstName || null, lastName: lastName || null,
    role: role === "admin" ? "admin" : "user",
  }).returning();
  res.status(201).json({ id: created.id, email: created.email, firstName: created.firstName, lastName: created.lastName, role: created.role });
});

router.post("/admin/users/:id/reset-password", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const id = req.params["id"];
  const { password } = req.body ?? {};
  if (!id || !password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" }); return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id, ok: true });
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const id = req.params["id"];
  if (!id) { res.status(400).json({ error: "id is required" }); return; }
  if (id === ctx.userId) { res.status(400).json({ error: "You cannot delete your own account" }); return; }
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
  res.sendStatus(204);
});

export default router;
