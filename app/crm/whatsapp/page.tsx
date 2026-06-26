import { PageHeader } from "@/components/page-shell";
import Inbox from "./inbox";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Bandeja unificada WhatsApp / Instagram / Messenger."
      />
      <Inbox />
    </>
  );
}
