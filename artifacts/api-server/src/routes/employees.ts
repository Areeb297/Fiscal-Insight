import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, employeesTable, ctcRulesTable } from "@workspace/db";
import {
  ListEmployeesParams,
  CreateEmployeeParams,
  CreateEmployeeBody,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
} from "@workspace/api-zod";
import { getCtcMultiplier } from "./projections";

const router: IRouter = Router();

async function enrichEmployee(emp: typeof employeesTable.$inferSelect) {
  const multiplier = await getCtcMultiplier(emp.country);
  const ctc = emp.salarySar * multiplier;
  const totalYearlyCost = ctc * emp.monthsFte;
  return { ...emp, ctc, totalYearlyCost };
}

router.get("/projections/:projectionId/employees", async (req, res): Promise<void> => {
  const params = ListEmployeesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const employees = await db.select().from(employeesTable).where(eq(employeesTable.projectionId, params.data.projectionId)).orderBy(employeesTable.createdAt);
  const enriched = await Promise.all(employees.map(enrichEmployee));
  res.json(enriched);
});

router.post("/projections/:projectionId/employees", async (req, res): Promise<void> => {
  const params = CreateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [emp] = await db.insert(employeesTable).values({ ...parsed.data, projectionId: params.data.projectionId }).returning();
  const enriched = await enrichEmployee(emp);
  res.status(201).json(enriched);
});

router.put("/projections/:projectionId/employees/:id", async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [emp] = await db.update(employeesTable).set(parsed.data).where(and(eq(employeesTable.id, params.data.id), eq(employeesTable.projectionId, params.data.projectionId))).returning();
  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const enriched = await enrichEmployee(emp);
  res.json(enriched);
});

router.delete("/projections/:projectionId/employees/:id", async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [emp] = await db.delete(employeesTable).where(and(eq(employeesTable.id, params.data.id), eq(employeesTable.projectionId, params.data.projectionId))).returning();
  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
