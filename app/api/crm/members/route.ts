import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await requireApiStaff();
  if (!staff) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const members = await prisma.member.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      memberships: {
        orderBy: { endDate: "desc" },
        take: 1,
        include: { plan: { select: { name: true } } },
      },
      _count: { select: { bookings: true } },
    },
  });

  return NextResponse.json({
    members: members.map((m) => {
      const lastMembership = m.memberships[0];
      return {
        id: m.id,
        name: m.name,
        phone: m.phone,
        email: m.email,
        status: m.status,
        // No exponemos el hash, solo si el socio tiene acceso habilitado.
        hasLogin: Boolean(m.passwordHash),
        plan: lastMembership?.plan.name ?? null,
        membershipEnd: lastMembership?.endDate ?? null,
        paymentStatus: lastMembership?.paymentStatus ?? null,
        bookings: m._count.bookings,
        joinedAt: m.joinedAt,
      };
    }),
  });
}
