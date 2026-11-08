import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPassword } from "@/app/actions/password";
import { Button } from "@/components/ui/Button";
import { BrandPanel, TrustSeal } from "@/components/auth/BrandPanel";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; error?: string }>;
}) {
  const { email, token, error } = await searchParams;
  if (!email || !token) redirect("/recuperar");

  return (
    <div className="flex min-h-screen w-full">
      <BrandPanel />

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <h1 className="font-display text-2xl font-semibold text-text">
            Crea tu nueva contraseña
          </h1>
          <p className="mb-6 mt-1.5 text-sm text-text-2">
            Para la cuenta <b className="text-text">{email}</b>.
          </p>

          {error && (
            <p className="mb-4 rounded-ctl border border-danger-brd bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          <form action={resetPassword} className="flex flex-col gap-4">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="token" value={token} />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Nueva contraseña</span>
              <PasswordInput
                name="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Confírmala</span>
              <PasswordInput name="confirmPassword" required minLength={8} placeholder="••••••••••" />
            </label>
            <Button type="submit">Guardar contraseña</Button>
          </form>

          <p className="mt-5 text-center text-sm text-text-2">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>

          <TrustSeal />
        </div>
      </main>
    </div>
  );
}
