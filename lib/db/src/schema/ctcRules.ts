import { pgTable, serial, text, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ctcRulesTable = pgTable("ctc_rules", {
  id: serial("id").primaryKey(),
  countryName: text("country_name").notNull(),
  countryCode: text("country_code").notNull().unique(),
  ctcMultiplier: real("ctc_multiplier").notNull().default(1.0),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCtcRuleSchema = createInsertSchema(ctcRulesTable).omit({ id: true });
export type InsertCtcRule = z.infer<typeof insertCtcRuleSchema>;
export type CtcRule = typeof ctcRulesTable.$inferSelect;
