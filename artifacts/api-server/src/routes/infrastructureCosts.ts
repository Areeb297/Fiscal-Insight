import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, infrastructureCostsTable } from "@workspace/db";
import {
  ListInfrastructureCostsParams,
  CreateInfrastructureCostParams,
  CreateInfrastructureCostBody,
  UpdateInfrastructureCostParams,
  UpdateInfrastructureCostBody,
  DeleteInfrastructureCostParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projections/:projectionId/infrastructure-costs", async (req, res): Promise<void> => {
  const params = ListInfrastructureCostsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(infrastructureCostsTable)
    .where(eq(infrastructureCostsTable.projectionId, params.data.projectionId))
    .orderBy(infrastructureCostsTable.createdAt);
  res.json(rows);
});

router.post("/projections/:projectionId/infrastructure-costs", async (req, res): Promise<void> => {
  const params = CreateInfrastructureCostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateInfrastructureCostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(infrastructureCostsTable)
    .values({ ...parsed.data, projectionId: params.data.projectionId })
    .returning();
  res.status(201).json(row);
});

router.put("/projections/:projectionId/infrastructure-costs/:id", async (req, res): Promise<void> => {
  const params = UpdateInfrastructureCostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateInfrastructureCostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(infrastructureCostsTable)
    .set(parsed.data)
    .where(
      and(
        eq(infrastructureCostsTable.id, params.data.id),
        eq(infrastructureCostsTable.projectionId, params.data.projectionId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Infrastructure cost not found" });
    return;
  }
  res.json(row);
});

router.delete("/projections/:projectionId/infrastructure-costs/:id", async (req, res): Promise<void> => {
  const params = DeleteInfrastructureCostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(infrastructureCostsTable)
    .where(
      and(
        eq(infrastructureCostsTable.id, params.data.id),
        eq(infrastructureCostsTable.projectionId, params.data.projectionId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Infrastructure cost not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
