import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  specialty: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

// PATCH — editar profesor.
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
    const instructor = await prisma.instructor.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ instructor: { id: instructor.id } });
  } catch {
    return NextResponse.json(
      { error: "Profesor no encontrado" },
      { status: 404 },
    );
  }
}

// DELETE — baja de profesor. Sus clases quedan sin profesor (SetNull).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await prisma.instructor.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Profesor no encontrado" },
      { status: 404 },
    );
  }
}
