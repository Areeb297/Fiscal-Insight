import { db } from "./index";
import { currenciesTable, ctcRulesTable, systemSettingsTable, projectionsTable, employeesTable, subscriptionsTable } from "./schema";

async function seed() {
  console.log("Seeding database...");

  const existingCurrencies = await db.select().from(currenciesTable);
  if (existingCurrencies.length === 0) {
    await db.insert(currenciesTable).values([
      { code: "SAR", name: "Saudi Riyal", symbol: "SAR", rateToSar: 1.0, isBase: true, isActive: true },
      { code: "USD", name: "US Dollar", symbol: "$", rateToSar: 3.75, isBase: false, isActive: true },
      { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", rateToSar: 0.0135, isBase: false, isActive: true },
    ]);
    console.log("Currencies seeded.");
  }

  const existingRules = await db.select().from(ctcRulesTable);
  if (existingRules.length === 0) {
    await db.insert(ctcRulesTable).values([
      { countryName: "Saudi Arabia", countryCode: "SA", ctcMultiplier: 1.5, notes: "Saudi office - CTC x 1.5", isActive: true },
      { countryName: "Pakistan", countryCode: "PK", ctcMultiplier: 1.0, notes: "Remote/Pakistan - no markup", isActive: true },
    ]);
    console.log("CTC rules seeded.");
  }

  const existingSettings = await db.select().from(systemSettingsTable);
  if (existingSettings.length === 0) {
    await db.insert(systemSettingsTable).values({
      companyName: "Ebttikar",
      vatRate: 0.15,
      defaultMargin: 0.30,
      defaultNumClients: 6,
      quotationPrefix: "QT",
      baseCurrencyCode: "SAR",
    });
    console.log("System settings seeded.");
  }

  const existingProjections = await db.select().from(projectionsTable);
  if (existingProjections.length === 0) {
    const [projection] = await db.insert(projectionsTable).values({
      yearLabel: "2026",
      sarRate: 3.75,
      numClients: 6,
      marginPercent: 0.30,
    }).returning();

    await db.insert(employeesTable).values([
      { projectionId: projection.id, name: "Ahmed Al-Rashidi", title: "Project Manager", country: "SA", salarySar: 18000, monthsFte: 12 },
      { projectionId: projection.id, name: "Sara Khan", title: "Senior Developer", country: "PK", salarySar: 8000, monthsFte: 12 },
      { projectionId: projection.id, name: "Mohammad Ali", title: "Full Stack Developer", country: "PK", salarySar: 6000, monthsFte: 12 },
      { projectionId: projection.id, name: "Fatima Noor", title: "UI/UX Designer", country: "PK", salarySar: 5500, monthsFte: 12 },
      { projectionId: projection.id, name: "Khalid Mahmood", title: "Business Analyst", country: "SA", salarySar: 15000, monthsFte: 12 },
    ]);

    await db.insert(subscriptionsTable).values([
      { projectionId: projection.id, name: "Claude AI", currency: "USD", originalPrice: 100 },
      { projectionId: projection.id, name: "GPT-4 API", currency: "USD", originalPrice: 200 },
      { projectionId: projection.id, name: "ElevenLabs", currency: "USD", originalPrice: 99 },
      { projectionId: projection.id, name: "Hosting & Integration", currency: "SAR", originalPrice: 2000 },
      { projectionId: projection.id, name: "ZATCA Compliance", currency: "SAR", originalPrice: 500 },
    ]);

    console.log("Sample projection with employees and subscriptions seeded.");
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
