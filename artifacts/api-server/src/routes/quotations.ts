import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, quotationsTable, quotationLineItemsTable } from "@workspace/db";
import {
  CreateQuotationBody,
  GetQuotationParams,
  UpdateQuotationParams,
  UpdateQuotationBody,
  DeleteQuotationParams,
  CreateQuotationLineItemParams,
  CreateQuotationLineItemBody,
  UpdateQuotationLineItemParams,
  UpdateQuotationLineItemBody,
  DeleteQuotationLineItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getQuotationWithLineItems(quotationId: number) {
  const [quotation] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, quotationId));
  if (!quotation) return null;
  const lineItems = await db.select().from(quotationLineItemsTable).where(eq(quotationLineItemsTable.quotationId, quotationId)).orderBy(quotationLineItemsTable.sortOrder);
  return { ...quotation, lineItems };
}

router.get("/quotations", async (_req, res): Promise<void> => {
  const quotations = await db.select().from(quotationsTable).orderBy(quotationsTable.createdAt);
  res.json(quotations);
});

router.post("/quotations", async (req, res): Promise<void> => {
  const parsed = CreateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quotation] = await db.insert(quotationsTable).values(parsed.data).returning();
  const result = await getQuotationWithLineItems(quotation.id);
  res.status(201).json(result);
});

router.get("/quotations/:id", async (req, res): Promise<void> => {
  const params = GetQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getQuotationWithLineItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.json(result);
});

router.put("/quotations/:id", async (req, res): Promise<void> => {
  const params = UpdateQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quotation] = await db.update(quotationsTable).set(parsed.data).where(eq(quotationsTable.id, params.data.id)).returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const result = await getQuotationWithLineItems(quotation.id);
  res.json(result);
});

router.delete("/quotations/:id", async (req, res): Promise<void> => {
  const params = DeleteQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quotation] = await db.delete(quotationsTable).where(eq(quotationsTable.id, params.data.id)).returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quotations/:quotationId/line-items", async (req, res): Promise<void> => {
  const params = CreateQuotationLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateQuotationLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(quotationLineItemsTable).values({ ...parsed.data, quotationId: params.data.quotationId }).returning();
  res.status(201).json(item);
});

router.put("/quotations/:quotationId/line-items/:id", async (req, res): Promise<void> => {
  const params = UpdateQuotationLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuotationLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.update(quotationLineItemsTable).set(parsed.data).where(eq(quotationLineItemsTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }
  res.json(item);
});

router.delete("/quotations/:quotationId/line-items/:id", async (req, res): Promise<void> => {
  const params = DeleteQuotationLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db.delete(quotationLineItemsTable).where(eq(quotationLineItemsTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
