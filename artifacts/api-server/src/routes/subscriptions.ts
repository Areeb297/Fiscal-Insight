import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import {
  ListSubscriptionsParams,
  CreateSubscriptionParams,
  CreateSubscriptionBody,
  UpdateSubscriptionParams,
  UpdateSubscriptionBody,
  DeleteSubscriptionParams,
} from "@workspace/api-zod";
import { getCurrencyRate } from "./projections";

const router: IRouter = Router();

async function enrichSubscription(sub: typeof subscriptionsTable.$inferSelect) {
  const rate = sub.currency === "SAR" ? 1.0 : await getCurrencyRate(sub.currency);
  const sarEquivalent = sub.originalPrice * rate;
  const monthlySar = sub.isOneTime ? sarEquivalent / 12 : sarEquivalent;
  const yearlySar = sub.isOneTime ? sarEquivalent : sarEquivalent * 12;
  return { ...sub, sarEquivalent, yearlySar, monthlySar };
}

router.get("/projections/:projectionId/subscriptions", async (req, res): Promise<void> => {
  const params = ListSubscriptionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.projectionId, params.data.projectionId)).orderBy(subscriptionsTable.createdAt);
  const enriched = await Promise.all(subs.map(enrichSubscription));
  res.json(enriched);
});

router.post("/projections/:projectionId/subscriptions", async (req, res): Promise<void> => {
  const params = CreateSubscriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sub] = await db.insert(subscriptionsTable).values({ ...parsed.data, projectionId: params.data.projectionId }).returning();
  const enriched = await enrichSubscription(sub);
  res.status(201).json(enriched);
});

router.put("/projections/:projectionId/subscriptions/:id", async (req, res): Promise<void> => {
  const params = UpdateSubscriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sub] = await db.update(subscriptionsTable).set(parsed.data).where(and(eq(subscriptionsTable.id, params.data.id), eq(subscriptionsTable.projectionId, params.data.projectionId))).returning();
  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  const enriched = await enrichSubscription(sub);
  res.json(enriched);
});

router.delete("/projections/:projectionId/subscriptions/:id", async (req, res): Promise<void> => {
  const params = DeleteSubscriptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [sub] = await db.delete(subscriptionsTable).where(and(eq(subscriptionsTable.id, params.data.id), eq(subscriptionsTable.projectionId, params.data.projectionId))).returning();
  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
