import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const staff = await prisma.staff.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Mensaje genérico para no filtrar si el correo existe.
  const invalid = NextResponse.json(
    { error: "Correo o contraseña incorrectos" },
    { status: 401 },
  );

  if (!staff || !staff.isActive) return invalid;

  const ok = await bcrypt.compare(password, staff.passwordHash);
  if (!ok) return invalid;

  const session = await getSession();
  session.staffId = staff.id;
  session.email = staff.email;
  session.name = staff.name;
  session.role = staff.role;
  await session.save();

  return NextResponse.json({ ok: true });
}
