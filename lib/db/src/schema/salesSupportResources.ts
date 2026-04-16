import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectionsTable } from "./projections";

export const salesSupportResourcesTable = pgTable("sales_support_resources", {
  id: serial("id").primaryKey(),
  projectionId: integer("projection_id").notNull().references(() => projectionsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  country: text("country").notNull(),
  salarySar: real("salary_sar").notNull().default(0),
  months: integer("months").notNull().default(6),
  marginPercent: real("margin_percent").notNull().default(0.30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSalesSupportResourceSchema = createInsertSchema(salesSupportResourcesTable).omit({ id: true, createdAt: true });
export type InsertSalesSupportResource = z.infer<typeof insertSalesSupportResourceSchema>;
export type SalesSupportResource = typeof salesSupportResourcesTable.$inferSelect;
