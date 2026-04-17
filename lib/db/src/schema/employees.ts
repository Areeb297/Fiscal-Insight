import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectionsTable } from "./projections";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  projectionId: integer("projection_id").notNull().references(() => projectionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  country: text("country").notNull(),
  salarySar: real("salary_sar").notNull().default(0),
  monthsFte: integer("months_fte").notNull().default(12),
  allocationPercent: real("allocation_percent").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
