import { NextResponse } from "next/server";
import { checkBotKey } from "@/lib/auth";
import { getGymFacts } from "@/lib/bot/knowledge";

export const dynamic = "force-dynamic";

// Datos dinámicos del gimnasio (GymSetting + planes/clases activos) como JSON.
// Comparte queries con /api/bot/prompt vía getGymFacts(). Protegido por x-bot-key.
// El bot ya usa /api/bot/prompt (system prompt completo); este endpoint queda como
// acceso a datos crudos por si otro consumidor los necesita.
export async function GET(req: Request) {
  if (!checkBotKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const facts = await getGymFacts();
  return NextResponse.json(facts);
}
