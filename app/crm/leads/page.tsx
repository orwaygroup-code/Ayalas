import { PageHeader } from "@/components/page-shell";
import LeadsList from "./leads-list";

export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Prospectos capturados por el bot. Gestiona el embudo cambiando su estado."
      />
      <LeadsList />
    </>
  );
}
