import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["ACTIVO", "CONGELADO", "CANCELADO", "INVITADO"]).optional(),
  name: z.string().trim().min(1).optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// PATCH — el staff edita estado/datos del socio.
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
    const member = await prisma.member.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({
      member: { id: member.id, status: member.status, name: member.name },
    });
  } catch {
    // P2025 (no existe) o P2002 (email duplicado).
    return NextResponse.json(
      { error: "Socio no encontrado o email duplicado" },
      { status: 409 },
    );
  }
}
