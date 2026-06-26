import { PageHeader } from "@/components/page-shell";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración del bot"
        subtitle="Respuestas de Info 24/7 que el bot usa al contestar (dirección, horario, bienvenida)."
      />
      <SettingsForm />
    </>
  );
}
