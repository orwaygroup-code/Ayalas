import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";
import { TAG_COLOR_TOKENS } from "@/lib/tag-colors";

export const dynamic = "force-dynamic";

// GET — lista de tags activos (para el picker y la gestión).
export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { conversations: true, members: true } },
    },
  });

  return NextResponse.json({
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      description: t.description,
      usage: t._count.conversations + t._count.members,
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.enum(TAG_COLOR_TOKENS as [string, ...string[]]).default("slate"),
  description: z.string().trim().max(200).optional(),
});

// POST — crear tag. Si el nombre ya existe, lo reutiliza (reactivándolo si
// estaba inactivo) en vez de duplicar: el picker "buscar/crear" depende de esto.
export async function POST(req: Request) {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { name, color, description } = parsed.data;

  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing) {
    const tag = existing.isActive
      ? existing
      : await prisma.tag.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
    return NextResponse.json(
      { tag: { id: tag.id, name: tag.name, color: tag.color }, reused: true },
      { status: 200 },
    );
  }

  const tag = await prisma.tag.create({
    data: { name, color, description },
  });
  return NextResponse.json(
    { tag: { id: tag.id, name: tag.name, color: tag.color }, reused: false },
    { status: 201 },
  );
}
