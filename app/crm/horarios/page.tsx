import { PageHeader } from "@/components/page-shell";
import HorariosCalendar from "./horarios-calendar";

export const dynamic = "force-dynamic";

export default function HorariosPage() {
  return (
    <>
      <PageHeader
        title="Horarios"
        subtitle="Calendario semanal por área. Asigna el profesor de cada clase; se refleja en la sección Profesores."
      />
      <HorariosCalendar />
    </>
  );
}
