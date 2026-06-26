import { PageHeader, ComingSoon } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Prospectos capturados por el bot. El embudo se llena en la Fase 4."
      />
      <ComingSoon phase="Fase 4 (Bot de Info + captura de Lead)" />
    </>
  );
}
