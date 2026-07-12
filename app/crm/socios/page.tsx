import { PageHeader } from "@/components/page-shell";
import MembersList from "./members-list";

export const dynamic = "force-dynamic";

export default function SociosPage() {
  return (
    <>
      <PageHeader
        title="Socios"
        subtitle="Socios del gimnasio, su plan y estado. El icono de llave indica acceso al portal/app habilitado."
      />
      <MembersList />
    </>
  );
}
