import { PageHeader, ComingSoon } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default function MarketingPage() {
  return (
    <>
      <PageHeader
        title="Marketing"
        subtitle="Campañas por tag con plantillas de Meta para retención."
      />
      <ComingSoon phase="Fase 6 (Marketing / retención)" />
    </>
  );
}
