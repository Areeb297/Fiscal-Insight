import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectionsTable } from "./projections";

export const infrastructureCostsTable = pgTable("infrastructure_costs", {
  id: serial("id").primaryKey(),
  projectionId: integer("projection_id").notNull().references(() => projectionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("compute"),
  currency: text("currency").notNull().default("SAR"),
  amount: real("amount").notNull().default(0),
  billingCycle: text("billing_cycle").notNull().default("one_time"),
  marginPercent: real("margin_percent").notNull().default(0.05),
  allocationBasis: text("allocation_basis").notNull().default("shared"),
  assignedClientCount: integer("assigned_client_count"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInfrastructureCostSchema = createInsertSchema(infrastructureCostsTable).omit({ id: true, createdAt: true });
export type InsertInfrastructureCost = z.infer<typeof insertInfrastructureCostSchema>;
export type InfrastructureCost = typeof infrastructureCostsTable.$inferSelect;
