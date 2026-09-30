import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandPanel, TrustSeal } from "@/components/auth/BrandPanel";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  return (
    <div className="flex min-h-screen w-full">
      <BrandPanel />

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <h1 className="font-display text-2xl font-semibold text-text">
            Recupera tu contraseña
          </h1>
          <p className="mb-6 mt-1.5 text-sm text-text-2">
            Te enviaremos un link para crear una nueva.
          </p>

          {ok && (
            <p className="mb-4 rounded-ctl border border-success-brd bg-success-soft p-3 text-sm text-success">
              Si existe una cuenta con ese correo, te enviamos un link para
              restablecer tu contraseña. Revisa tu bandeja (y el spam); es
              válido por 1 hora.
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-ctl border border-danger-brd bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          {!ok && (
            <form action={requestPasswordReset} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text">Correo profesional</span>
                <Input type="email" name="email" required placeholder="tu@correo.com" />
              </label>
              <Button type="submit">Enviarme el link</Button>
            </form>
          )}

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
