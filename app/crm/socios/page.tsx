import { PageHeader, ComingSoon } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default function SociosPage() {
  return (
    <>
      <PageHeader
        title="Socios"
        subtitle="Membresías, pagos y asistencia. Se nutre conforme avancen las fases."
      />
      <ComingSoon phase="fases posteriores" />
    </>
  );
}
