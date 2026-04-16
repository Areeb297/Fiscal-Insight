import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, salesSupportResourcesTable } from "@workspace/db";
import {
  ListSalesSupportResourcesParams,
  CreateSalesSupportResourceParams,
  CreateSalesSupportResourceBody,
  UpdateSalesSupportResourceParams,
  UpdateSalesSupportResourceBody,
  DeleteSalesSupportResourceParams,
} from "@workspace/api-zod";
import { getCtcMultiplier } from "./projections";

const router: IRouter = Router();

async function enrichResource(r: typeof salesSupportResourcesTable.$inferSelect) {
  const multiplier = await getCtcMultiplier(r.country);
  const ctc = r.salarySar * multiplier;
  const totalSalaryCost = ctc * r.months;
  return { ...r, ctc, totalSalaryCost };
}

router.get("/projections/:projectionId/sales-support", async (req, res): Promise<void> => {
  const params = ListSalesSupportResourcesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const resources = await db.select().from(salesSupportResourcesTable).where(eq(salesSupportResourcesTable.projectionId, params.data.projectionId)).orderBy(salesSupportResourcesTable.createdAt);
  const enriched = await Promise.all(resources.map(enrichResource));
  res.json(enriched);
});

router.post("/projections/:projectionId/sales-support", async (req, res): Promise<void> => {
  const params = CreateSalesSupportResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateSalesSupportResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [r] = await db.insert(salesSupportResourcesTable).values({ ...parsed.data, projectionId: params.data.projectionId }).returning();
  const enriched = await enrichResource(r);
  res.status(201).json(enriched);
});

router.put("/projections/:projectionId/sales-support/:id", async (req, res): Promise<void> => {
  const params = UpdateSalesSupportResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSalesSupportResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [r] = await db.update(salesSupportResourcesTable).set(parsed.data).where(and(eq(salesSupportResourcesTable.id, params.data.id), eq(salesSupportResourcesTable.projectionId, params.data.projectionId))).returning();
  if (!r) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  const enriched = await enrichResource(r);
  res.json(enriched);
});

router.delete("/projections/:projectionId/sales-support/:id", async (req, res): Promise<void> => {
  const params = DeleteSalesSupportResourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [r] = await db.delete(salesSupportResourcesTable).where(and(eq(salesSupportResourcesTable.id, params.data.id), eq(salesSupportResourcesTable.projectionId, params.data.projectionId))).returning();
  if (!r) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
