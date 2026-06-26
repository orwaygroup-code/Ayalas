import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Segmentación de una campaña: por tags de conversación, de socio, o ambos.
export const filtersSchema = z.object({
  tagIds: z.array(z.string().min(1)).min(1),
  mode: z.enum(["any", "all"]).default("any"), // OR / AND entre tags
  source: z.enum(["conv", "user", "both"]).default("conv"),
});
export type CampaignFilters = z.infer<typeof filtersSchema>;

export type Recipient = {
  phone: string;
  conversationId?: string;
  memberId?: string;
};

// Resuelve la audiencia de una campaña, deduplicada por teléfono.
// - source conv  → conversaciones con esos ConversationTag
// - source user  → socios con esos MemberTag
// - source both  → unión, dedup por teléfono
// - mode any     → al menos uno de los tags;  mode all → todos
export async function resolveRecipients(
  filters: CampaignFilters,
): Promise<Recipient[]> {
  const { tagIds, mode, source } = filters;
  if (tagIds.length === 0) return [];
  const need = tagIds.length;
  const byPhone = new Map<string, Recipient>();

  if (source === "conv" || source === "both") {
    const convs = await prisma.whatsAppConversation.findMany({
      where: { tags: { some: { tagId: { in: tagIds } } } },
      select: {
        id: true,
        phone: true,
        tags: { where: { tagId: { in: tagIds } }, select: { tagId: true } },
      },
    });
    for (const c of convs) {
      const distinct = new Set(c.tags.map((t) => t.tagId)).size;
      if (mode === "all" && distinct < need) continue;
      if (!byPhone.has(c.phone)) {
        byPhone.set(c.phone, { phone: c.phone, conversationId: c.id });
      }
    }
  }

  if (source === "user" || source === "both") {
    const members = await prisma.member.findMany({
      where: { tags: { some: { tagId: { in: tagIds } } } },
      select: {
        id: true,
        phone: true,
        tags: { where: { tagId: { in: tagIds } }, select: { tagId: true } },
      },
    });
    for (const m of members) {
      const distinct = new Set(m.tags.map((t) => t.tagId)).size;
      if (mode === "all" && distinct < need) continue;
      const existing = byPhone.get(m.phone);
      if (existing) existing.memberId = m.id;
      else byPhone.set(m.phone, { phone: m.phone, memberId: m.id });
    }
  }

  return [...byPhone.values()];
}
