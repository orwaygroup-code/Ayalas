import { NextResponse } from "next/server";
import { checkBotKey } from "@/lib/auth";
import { getGymFacts } from "@/lib/bot/knowledge";
import { buildSystemPrompt } from "@/lib/bot/persona";

export const dynamic = "force-dynamic";

// Devuelve el system prompt COMPLETO del bot (persona + guardrails + datos de la DB
// + contrato JSON de salida). n8n lo pide en cada mensaje y lo pasa como rol "system"
// a OpenAI. Así el "cerebro" del bot vive versionado en el repo, no en el nodo de n8n.
// Protegido por x-bot-key.
export async function GET(req: Request) {
  if (!checkBotKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const facts = await getGymFacts();
  return NextResponse.json({ system: buildSystemPrompt(facts) });
}
