import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectionsTable } from "./projections";

export const quotationsTable = pgTable("quotations", {
  id: serial("id").primaryKey(),
  projectionId: integer("projection_id").references(() => projectionsTable.id, { onDelete: "set null" }),
  quotationNumber: text("quotation_number").notNull(),
  companyName: text("company_name").notNull().default("Your Company"),
  clientName: text("client_name").notNull().default("Client Name"),
  date: text("date").notNull(),
  status: text("status").notNull().default("draft"),
  termsText: text("terms_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotationsTable.$inferSelect;

export const quotationLineItemsTable = pgTable("quotation_line_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotationsTable.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: text("unit").notNull().default("Package"),
  priceMonthly: real("price_monthly").notNull().default(0),
  totalMonths: integer("total_months").notNull().default(12),
  isExcluded: boolean("is_excluded").notNull().default(false),
});

export const insertQuotationLineItemSchema = createInsertSchema(quotationLineItemsTable).omit({ id: true });
export type InsertQuotationLineItem = z.infer<typeof insertQuotationLineItemSchema>;
export type QuotationLineItem = typeof quotationLineItemsTable.$inferSelect;
