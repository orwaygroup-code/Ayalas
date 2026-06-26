import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const staff = await getCurrentStaff();
  if (staff) redirect("/crm");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Ayalas CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Acceso para personal del gym</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
