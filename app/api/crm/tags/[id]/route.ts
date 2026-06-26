import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";
import { TAG_COLOR_TOKENS } from "@/lib/tag-colors";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.enum(TAG_COLOR_TOKENS as [string, ...string[]]).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
});

// PATCH — editar nombre/color/descripción/estado del tag.
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
    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({
      tag: { id: tag.id, name: tag.name, color: tag.color, isActive: tag.isActive },
    });
  } catch {
    return NextResponse.json({ error: "Tag no encontrado o nombre duplicado" }, { status: 409 });
  }
}

// DELETE — soft-delete: marca isActive=false para conservar el historial de
// asignaciones (ConversationTag/MemberTag harían cascade en hard-delete).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await prisma.tag.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tag no encontrado" }, { status: 404 });
  }
}
