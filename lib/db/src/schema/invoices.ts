import { pgTable, serial, text, integer, real, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectionsTable } from "./projections";

export const invoicesTable = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id"),
    projectionId: integer("projection_id").references(() => projectionsTable.id, { onDelete: "set null" }),
    invoiceNumber: text("invoice_number").notNull(),
    clientKey: text("client_key").notNull(),
    clientName: text("client_name").notNull(),
    companyName: text("company_name").notNull().default("Your Company"),
    billingMonth: text("billing_month").notNull(),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull(),
    status: text("status").notNull().default("draft"),
    paidDate: text("paid_date"),
    notes: text("notes"),
    currencyCode: text("currency_code").notNull().default("SAR"),
    vatRate: real("vat_rate").notNull().default(0.15),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqProjClientMonth: uniqueIndex("invoices_proj_client_month_uniq").on(t.projectionId, t.clientKey, t.billingMonth),
  }),
);

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;

export const invoiceLineItemsTable = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  marginPercent: real("margin_percent").notNull().default(0),
  vatRate: real("vat_rate").notNull().default(0.15),
  sourceKind: text("source_kind"),
  sourceRefId: integer("source_ref_id"),
  isManual: boolean("is_manual").notNull().default(false),
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItemsTable).omit({ id: true });
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type InvoiceLineItem = typeof invoiceLineItemsTable.$inferSelect;
