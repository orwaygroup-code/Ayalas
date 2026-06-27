import { PageHeader } from "@/components/page-shell";
import CampaignForm from "./campaign-form";

export const dynamic = "force-dynamic";

export default function NuevaCampanaPage() {
  return (
    <>
      <PageHeader
        title="Nueva campaña"
        subtitle="Segmenta por tag, revisa el alcance y crea la campaña."
      />
      <CampaignForm />
    </>
  );
}
