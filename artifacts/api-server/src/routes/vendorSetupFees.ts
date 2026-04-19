import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, vendorSetupFeesTable } from "@workspace/db";
import {
  ListVendorSetupFeesParams,
  CreateVendorSetupFeeParams,
  CreateVendorSetupFeeBody,
  UpdateVendorSetupFeeParams,
  UpdateVendorSetupFeeBody,
  DeleteVendorSetupFeeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projections/:projectionId/vendor-setup-fees", async (req, res): Promise<void> => {
  const params = ListVendorSetupFeesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(vendorSetupFeesTable)
    .where(eq(vendorSetupFeesTable.projectionId, params.data.projectionId))
    .orderBy(vendorSetupFeesTable.createdAt);
  res.json(rows);
});

router.post("/projections/:projectionId/vendor-setup-fees", async (req, res): Promise<void> => {
  const params = CreateVendorSetupFeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateVendorSetupFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(vendorSetupFeesTable)
    .values({ ...parsed.data, projectionId: params.data.projectionId })
    .returning();
  res.status(201).json(row);
});

router.put("/projections/:projectionId/vendor-setup-fees/:id", async (req, res): Promise<void> => {
  const params = UpdateVendorSetupFeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVendorSetupFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(vendorSetupFeesTable)
    .set(parsed.data)
    .where(
      and(
        eq(vendorSetupFeesTable.id, params.data.id),
        eq(vendorSetupFeesTable.projectionId, params.data.projectionId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Vendor setup fee not found" });
    return;
  }
  res.json(row);
});

router.delete("/projections/:projectionId/vendor-setup-fees/:id", async (req, res): Promise<void> => {
  const params = DeleteVendorSetupFeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(vendorSetupFeesTable)
    .where(
      and(
        eq(vendorSetupFeesTable.id, params.data.id),
        eq(vendorSetupFeesTable.projectionId, params.data.projectionId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Vendor setup fee not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
