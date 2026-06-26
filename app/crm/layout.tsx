import { requireStaff } from "@/lib/auth";
import CrmShell from "@/components/crm-shell";

export const dynamic = "force-dynamic";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  return <CrmShell staffName={staff.name}>{children}</CrmShell>;
}
