import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";

export default async function HomePage() {
  const staff = await getCurrentStaff();
  redirect(staff ? "/crm" : "/login");
}
