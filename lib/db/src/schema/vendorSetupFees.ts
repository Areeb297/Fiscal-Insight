import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectionsTable } from "./projections";

export const vendorSetupFeesTable = pgTable("vendor_setup_fees", {
  id: serial("id").primaryKey(),
  projectionId: integer("projection_id").notNull().references(() => projectionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  vendorName: text("vendor_name").notNull().default(""),
  currency: text("currency").notNull().default("SAR"),
  amount: real("amount").notNull().default(0),
  amortizeMonths: integer("amortize_months").notNull().default(12),
  marginPercent: real("margin_percent").notNull().default(0.20),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVendorSetupFeeSchema = createInsertSchema(vendorSetupFeesTable).omit({ id: true, createdAt: true });
export type InsertVendorSetupFee = z.infer<typeof insertVendorSetupFeeSchema>;
export type VendorSetupFee = typeof vendorSetupFeesTable.$inferSelect;
