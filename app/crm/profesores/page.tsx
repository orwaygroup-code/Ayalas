import { PageHeader } from "@/components/page-shell";
import ProfesoresList from "./profesores-list";

export const dynamic = "force-dynamic";

export default function ProfesoresPage() {
  return (
    <>
      <PageHeader
        title="Profesores"
        subtitle="Da de alta a los profesores y mira las clases y horas que imparte cada uno. Asigna quién da cada clase desde Horarios."
      />
      <ProfesoresList />
    </>
  );
}
