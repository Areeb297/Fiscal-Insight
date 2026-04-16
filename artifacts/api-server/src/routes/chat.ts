import { Router, type IRouter } from "express";
import { SendChatMessageBody } from "@workspace/api-zod";
import { db, projectionsTable, employeesTable, subscriptionsTable, salesSupportResourcesTable, systemSettingsTable } from "@workspace/db";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

async function getProjectionContext(): Promise<string> {
  const projections = await db.select().from(projectionsTable);
  const employees = await db.select().from(employeesTable);
  const subs = await db.select().from(subscriptionsTable);
  const salesResources = await db.select().from(salesSupportResourcesTable);
  const [settings] = await db.select().from(systemSettingsTable);

  return `Current system data:
Projections: ${JSON.stringify(projections)}
Employees: ${JSON.stringify(employees)}
Subscriptions: ${JSON.stringify(subs)}
Sales Support Resources: ${JSON.stringify(salesResources)}
System Settings: ${JSON.stringify(settings)}`;
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const context = await getProjectionContext();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are an AI assistant for a department projection and cost management tool. You help users understand their financial data, projections, employee costs, and quotations. Be concise and professional. Here is the current data context:\n\n${context}`,
      messages: [
        { role: "user", content: parsed.data.message },
      ],
    });

    const textContent = response.content.find(c => c.type === "text");
    const reply = textContent ? textContent.text : "I could not generate a response.";

    res.json({ reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.json({ reply: "I'm having trouble connecting right now. Please try again in a moment." });
  }
});

export default router;
