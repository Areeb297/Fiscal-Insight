import { pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectionsTable = pgTable("projections", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id"),
  name: text("name"),
  yearLabel: text("year_label").notNull(),
  fiscalYear: text("fiscal_year").notNull().default(""),
  durationYears: integer("duration_years").notNull().default(1),
  vatRate: real("vat_rate").notNull().default(0.15),
  sarRate: real("sar_rate").notNull().default(3.75),
  numClients: integer("num_clients").notNull().default(5),
  marginPercent: real("margin_percent").notNull().default(0.30),
  startMonth: text("start_month"),
  autoGenerateInvoices: boolean("auto_generate_invoices").notNull().default(false),
  invoiceDayOfMonth: integer("invoice_day_of_month").notNull().default(1),
  invoicePaymentTermsDays: integer("invoice_payment_terms_days").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectionSchema = createInsertSchema(projectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjection = z.infer<typeof insertProjectionSchema>;
export type Projection = typeof projectionsTable.$inferSelect;
