import { PageHeader, ComingSoon } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Bandeja unificada WhatsApp / Instagram / Messenger."
      />
      <ComingSoon phase="Fase 2 (Ingesta + Inbox)" />
    </>
  );
}
