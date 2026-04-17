import { Router, type IRouter } from "express";
import { SendChatMessageBody } from "@workspace/api-zod";
import {
  db,
  projectionsTable,
  employeesTable,
  subscriptionsTable,
  salesSupportResourcesTable,
  ctcRulesTable,
  currenciesTable,
  systemSettingsTable,
} from "@workspace/db";
import { computeScenario, type ScenarioInputs, type ScenarioOverrides } from "../lib/summary";

const router: IRouter = Router();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.6";
const MAX_TOOL_ITERATIONS = 4;

async function loadScenarioInputs(): Promise<ScenarioInputs & { settings: unknown }> {
  const [projections, employees, subs, salesResources, ctcRules, currencies, settingsRows] =
    await Promise.all([
      db.select().from(projectionsTable),
      db.select().from(employeesTable),
      db.select().from(subscriptionsTable),
      db.select().from(salesSupportResourcesTable),
      db.select().from(ctcRulesTable),
      db.select().from(currenciesTable),
      db.select().from(systemSettingsTable),
    ]);
  return {
    projection: projections[0],
    employees,
    subscriptions: subs,
    salesResources,
    ctcRules,
    currencies,
    settings: settingsRows[0],
  };
}

function buildContext(inputs: ScenarioInputs & { settings: unknown }): string {
  return `# Live data snapshot

## Projection (active)
${JSON.stringify(inputs.projection, null, 2)}

## Employees
${JSON.stringify(inputs.employees, null, 2)}

## Subscriptions / Overheads (isOneTime amortized over 12 months)
${JSON.stringify(inputs.subscriptions, null, 2)}

## Sales Support / Managed Services
${JSON.stringify(inputs.salesResources, null, 2)}

## CTC Rules (country -> multiplier)
${JSON.stringify(inputs.ctcRules, null, 2)}

## Currencies (rateToSar)
${JSON.stringify(inputs.currencies, null, 2)}

## System Settings
${JSON.stringify(inputs.settings, null, 2)}`;
}

const SYSTEM_PROMPT = `You are the financial assistant for the Ebttikar department projection and cost-management tool.
You help users understand and discuss their financial data: projections, employee CTC by country, overheads (recurring + one-time), per-client economics, margins, selling prices, sales support resources, and quotations.

TOOLS:
You have a tool called \`run_scenario\` that recomputes the full projection summary using the live data with optional overrides (numClients, marginPercent, addMonthlyOverheadSar, scaleEmployeeSalariesBy, addEmployees). Whenever the user asks a "what if" question or asks for figures that aren't directly visible in the snapshot, CALL run_scenario instead of guessing — then quote its exact numbers in your reply.

OUTPUT FORMAT — IMPORTANT:
Respond in clean, semantic HTML using ONLY these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <h3>, <h4>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <code>, <pre>, <br>, <hr>, <blockquote>, <a>.
- Do NOT include <html>, <head>, <body>, <style>, or <script> tags.
- Do NOT wrap your response in markdown code fences.
- Use <table> for tabular comparisons or breakdowns of figures.
- Use <h3>/<h4> for section headings, <ul>/<ol> for lists, <strong> for key numbers.
- Format SAR amounts with thousands separators, e.g. <strong>SAR 12,500</strong>.
- Be concise but thorough. Show your reasoning.

Behavior:
- Ground every answer in the live data snapshot below or in run_scenario results.
- If data needed to answer is missing, say so clearly and suggest what to add.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "run_scenario",
      description:
        "Recomputes the full projection financial summary using live data with optional overrides. Use this for any what-if question (different client count, different margin, salary increases, extra overhead, hypothetical hires) instead of estimating manually.",
      parameters: {
        type: "object",
        properties: {
          numClients: {
            type: "number",
            description: "Override the number of clients (default: current value).",
          },
          marginPercent: {
            type: "number",
            description: "Override the target margin percent (e.g. 30 for 30%).",
          },
          addMonthlyOverheadSar: {
            type: "number",
            description: "Add this many SAR per month of extra recurring overhead.",
          },
          scaleEmployeeSalariesBy: {
            type: "number",
            description:
              "Multiply every existing employee salary by this factor (e.g. 1.10 for a 10% raise across the board).",
          },
          addEmployees: {
            type: "array",
            description: "Hypothetical employees to add to the team for this scenario.",
            items: {
              type: "object",
              properties: {
                salarySar: { type: "number", description: "Monthly base salary in SAR." },
                country: {
                  type: "string",
                  description: "Country name or code; CTC multiplier is looked up from CTC rules.",
                },
                monthsFte: {
                  type: "number",
                  description: "FTE months in the year (default 12).",
                },
              },
              required: ["salarySar", "country"],
            },
          },
        },
      },
    },
  },
];

function stripUnsafeTags(html: string): string {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
  cleaned = cleaned.replace(/^```html\s*/i, "").replace(/```$/g, "").trim();
  return cleaned;
}

function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type ChatMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

async function callOpenRouter(apiKey: string, messages: ChatMsg[]) {
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
      tools: TOOLS,
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }
  return (await response.json()) as {
    choices?: Array<{
      message?: ChatMsg;
      finish_reason?: string;
    }>;
  };
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
    const inputs = await loadScenarioInputs();
    const context = buildContext(inputs);

    const history: ChatMsg[] = (parsed.data.history ?? []).slice(-12).map((h) => ({
      role: h.role,
      content: h.content,
    }));

    const messages: ChatMsg[] = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
      ...history,
      { role: "user", content: parsed.data.message },
    ];

    let assistantMessage: ChatMsg | undefined;

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const data = await callOpenRouter(apiKey, messages);
      const choice = data.choices?.[0];
      assistantMessage = choice?.message;
      if (!assistantMessage) break;

      const toolCalls = assistantMessage.tool_calls ?? [];
      if (toolCalls.length === 0) break;

      messages.push({
        role: "assistant",
        content: assistantMessage.content ?? "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        let result: unknown;
        try {
          if (call.function.name === "run_scenario") {
            const args = JSON.parse(call.function.arguments || "{}") as ScenarioOverrides;
            if (!inputs.projection) {
              result = { error: "No active projection exists." };
            } else {
              result = computeScenario(inputs, args);
            }
          } else {
            result = { error: `Unknown tool: ${call.function.name}` };
          }
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(result),
        });
      }
    }

    const raw =
      typeof assistantMessage?.content === "string" ? assistantMessage.content : "";
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
