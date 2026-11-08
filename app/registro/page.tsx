import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signUp } from "@/app/actions/signup";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandPanel, TrustSeal } from "@/components/auth/BrandPanel";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen w-full">
      <BrandPanel />

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <h1 className="font-display text-2xl font-semibold text-text">Crear cuenta</h1>
          <p className="mb-6 mt-1.5 text-sm text-text-2">
            Para nutriólogos. Toma menos de un minuto.
          </p>

          {error && (
            <p className="mb-4 rounded-ctl border border-danger-brd bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          <form action={signUp} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Nombre completo</span>
              <Input name="name" required placeholder="Dra. Sofía Ramírez" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Correo profesional</span>
              <Input name="email" type="email" required placeholder="tu@correo.com" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Contraseña</span>
              <PasswordInput
                name="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
            </label>
            <Button type="submit">Crear cuenta gratis</Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11.5px] text-text-3">¿Ya tienes cuenta?</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center rounded-pill border border-border-strong bg-surface text-sm font-semibold text-text transition-colors hover:bg-surface-3"
          >
            Inicia sesión
          </Link>

          <TrustSeal />
        </div>
      </main>
    </div>
  );
}
