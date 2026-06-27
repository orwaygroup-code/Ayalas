import { PageHeader } from "@/components/page-shell";
import CampaignsList from "./campaigns-list";

export const dynamic = "force-dynamic";

export default function MarketingPage() {
  return (
    <>
      <PageHeader
        title="Marketing"
        subtitle="Campañas segmentadas por tag. El envío real lo entrega n8n vía plantillas de Meta."
      />
      <CampaignsList />
    </>
  );
}
