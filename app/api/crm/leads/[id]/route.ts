import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["NUEVO", "CONTACTADO", "CONVERTIDO", "PERDIDO"]).optional(),
  name: z.string().trim().min(1).optional(),
  notes: z.string().nullable().optional(),
});

// PATCH — el staff gestiona el embudo (estado, nombre, notas).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({
      lead: { id: lead.id, status: lead.status, name: lead.name },
    });
  } catch {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
}
