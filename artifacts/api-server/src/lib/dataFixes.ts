import { and, eq, gt, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { logger } from "./logger";

/**
 * Idempotent one-time data corrections that run on every server startup.
 * Each fix is safe to run multiple times (it checks before updating).
 */
export async function runDataFixes(): Promise<void> {
  await fixTeleconferenceHostingPrice();
}

/**
 * Teleconference Hosting was initially seeded / imported with USD 37.5.
 * The canonical value from the approved projection sheet is USD 10.
 * Update any rows still carrying the old price.
 */
async function fixTeleconferenceHostingPrice(): Promise<void> {
  const rows = await db
    .select({ id: subscriptionsTable.id, originalPrice: subscriptionsTable.originalPrice })
    .from(subscriptionsTable)
    .where(
      and(
        ilike(subscriptionsTable.name, "Teleconference Hosting"),
        eq(subscriptionsTable.currency, "USD"),
        gt(subscriptionsTable.originalPrice, 10),
      ),
    );

  if (rows.length === 0) return;

  await db
    .update(subscriptionsTable)
    .set({ originalPrice: 10 })
    .where(
      and(
        ilike(subscriptionsTable.name, "Teleconference Hosting"),
        eq(subscriptionsTable.currency, "USD"),
        gt(subscriptionsTable.originalPrice, 10),
      ),
    );

  logger.warn(
    { fixedCount: rows.length, ids: rows.map((r) => r.id) },
    "dataFix: Teleconference Hosting USD price corrected from >10 → 10",
  );
}
