import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  defaultMargin: real("default_margin").notNull().default(0.30),
  defaultNumClients: serial("default_num_clients").notNull(),
  vatRate: real("vat_rate").notNull().default(0.15),
  quotationPrefix: text("quotation_prefix").notNull().default("Q-"),
  companyName: text("company_name").notNull().default("Your Company"),
  companyLogoUrl: text("company_logo_url"),
  baseCurrencyCode: text("base_currency_code").notNull().default("SAR"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettingsTable).omit({ id: true, updatedAt: true });
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettingsTable.$inferSelect;
