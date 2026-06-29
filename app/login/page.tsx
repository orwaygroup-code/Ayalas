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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Ayalas Wellness Center"
            className="mx-auto mb-4 h-10 w-auto"
          />
          <p className="text-sm text-slate-500">Acceso para el personal</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
