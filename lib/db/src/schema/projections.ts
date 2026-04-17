import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectionsTable = pgTable("projections", {
  id: serial("id").primaryKey(),
  name: text("name"),
  yearLabel: text("year_label").notNull(),
  sarRate: real("sar_rate").notNull().default(3.75),
  numClients: integer("num_clients").notNull().default(5),
  marginPercent: real("margin_percent").notNull().default(0.30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectionSchema = createInsertSchema(projectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjection = z.infer<typeof insertProjectionSchema>;
export type Projection = typeof projectionsTable.$inferSelect;
