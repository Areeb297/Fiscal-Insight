import { Router, type IRouter } from "express";
import { SendChatMessageBody } from "@workspace/api-zod";
import { db, projectionsTable, employeesTable, subscriptionsTable, salesSupportResourcesTable, ctcRulesTable, currenciesTable, systemSettingsTable } from "@workspace/db";

const router: IRouter = Router();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.6";

async function getProjectionContext(): Promise<string> {
  const [projections, employees, subs, salesResources, ctcRules, currencies, settingsRows] = await Promise.all([
    db.select().from(projectionsTable),
    db.select().from(employeesTable),
    db.select().from(subscriptionsTable),
    db.select().from(salesSupportResourcesTable),
    db.select().from(ctcRulesTable),
    db.select().from(currenciesTable),
    db.select().from(systemSettingsTable),
  ]);
  const settings = settingsRows[0];

  return `# Live data snapshot

## Projections
${JSON.stringify(projections, null, 2)}

## Employees (department team)
${JSON.stringify(employees, null, 2)}

## Subscriptions / Overheads (isOneTime=true means amortized over 12 months)
${JSON.stringify(subs, null, 2)}

## Sales Support / Managed Services Resources
${JSON.stringify(salesResources, null, 2)}

## CTC Rules (cost-to-company multipliers per country)
${JSON.stringify(ctcRules, null, 2)}

## Currencies (exchange rates vs base currency)
${JSON.stringify(currencies, null, 2)}

## System Settings
${JSON.stringify(settings, null, 2)}`;
}

const SYSTEM_PROMPT = `You are the financial assistant for the Ebttikar department projection and cost-management tool.
You help users understand and discuss their financial data: projections, employee costs (CTC by country), overheads/subscriptions (recurring + one-time), per-client economics, margins, selling prices, sales support resources, and quotations.

OUTPUT FORMAT — IMPORTANT:
Respond in clean, semantic HTML using ONLY these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <h3>, <h4>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <code>, <pre>, <br>, <hr>, <blockquote>, <a>.
- Do NOT include <html>, <head>, <body>, <style>, or <script> tags.
- Do NOT wrap your response in markdown code fences.
- Use <table> for any tabular comparisons or breakdowns of figures.
- Use <h3>/<h4> for section headings, <ul>/<ol> for lists, <strong> for key numbers.
- Always format SAR amounts with thousands separators, e.g. <strong>SAR 12,500</strong>.
- Be concise but thorough. Show your reasoning when calculating figures.

Behavior:
- Ground every answer in the live data snapshot below. Cite specific employees, subscriptions, or numbers.
- If the user asks "what if" / scenarios, perform the math and explain it step by step.
- If data needed to answer is missing, say so clearly and suggest what to add.`;

const ALLOWED_TAGS = /^<\/?(p|strong|em|ul|ol|li|h3|h4|table|thead|tbody|tr|th|td|code|pre|br|hr|blockquote|a)(\s[^>]*)?>$/i;

function stripUnsafeTags(html: string): string {
  // Remove any <script>, <style>, on* handlers, and tags not in allow-list.
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
  // Strip ```html fences if model added them despite instructions.
  cleaned = cleaned.replace(/^```html\s*/i, "").replace(/```$/g, "").trim();
  return cleaned;
}

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      reply: "OpenRouter API key is not configured.",
      replyHtml: "<p>The OpenRouter API key is not configured on the server.</p>",
    });
    return;
  }

  try {
    const context = await getProjectionContext();

    const history = (parsed.data.history ?? []).slice(-12).map((h) => ({
      role: h.role,
      content: h.content,
    }));

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
      ...history,
      { role: "user", content: parsed.data.message },
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "https://replit.com",
        "X-Title": "Ebttikar Projection Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      res.json({
        reply: "I could not reach the AI service right now.",
        replyHtml: "<p>I could not reach the AI service right now. Please try again in a moment.</p>",
      });
      return;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const replyHtml = stripUnsafeTags(raw) || "<p>I could not generate a response.</p>";
    const reply = htmlToPlainText(replyHtml);

    res.json({ reply, replyHtml });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    res.json({
      reply: "I'm having trouble connecting right now. Please try again in a moment.",
      replyHtml: "<p>I'm having trouble connecting right now. Please try again in a moment.</p>",
    });
  }
});

export default router;
