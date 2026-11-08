import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandMobileHeader, BrandPanel, TrustSeal } from "@/components/auth/BrandPanel";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { error, ok } = await searchParams;

  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);
  const magicLinkEnabled = Boolean(process.env.AUTH_RESEND_KEY);

  return (
    <div className="flex min-h-screen w-full">
      <BrandPanel />

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <BrandMobileHeader />
          <h1 className="font-display text-2xl font-semibold text-text">Inicia sesión</h1>
          <p className="mb-6 mt-1.5 text-sm text-text-2">Qué gusto verte de nuevo.</p>

          {ok === "password-reset" && (
            <p className="mb-4 rounded-ctl border border-success-brd bg-success-soft p-3 text-sm text-success">
              Contraseña actualizada. Inicia sesión con la nueva.
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-ctl border border-danger-brd bg-danger-soft p-3 text-sm text-danger">
              {error === "CredentialsSignin"
                ? "Email o contraseña incorrectos."
                : "No se pudo iniciar sesión. Intenta de nuevo."}
            </p>
          )}

          <form
            action={async (formData: FormData) => {
              "use server";
              try {
                await signIn("credentials", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/dashboard",
                });
              } catch (e) {
                if (e instanceof AuthError) {
                  redirect("/login?error=CredentialsSignin");
                }
                throw e; // NEXT_REDIRECT from a successful login
              }
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Correo profesional</span>
              <Input type="email" name="email" required placeholder="tu@correo.com" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-text">Contraseña</span>
                <Link href="/recuperar" className="text-xs font-semibold text-primary hover:underline">
                  ¿La olvidaste?
                </Link>
              </span>
              <PasswordInput name="password" required placeholder="••••••••••" />
            </label>
            <Button type="submit">Entrar a mi consulta</Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11.5px] text-text-3">¿Primera vez aquí?</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Link
            href="/registro"
            className="flex h-10 w-full items-center justify-center rounded-pill border border-border-strong bg-surface text-sm font-semibold text-text transition-colors hover:bg-surface-3"
          >
            Crear cuenta gratis
          </Link>

          {(googleEnabled || magicLinkEnabled) && (
            <div className="mt-4 flex flex-col gap-3">
              {googleEnabled && (
                <form
                  action={async () => {
                    "use server";
                    await signIn("google", { redirectTo: "/dashboard" });
                  }}
                >
                  <Button type="submit" variant="secondary" className="w-full">
                    Continuar con Google
                  </Button>
                </form>
              )}
              {magicLinkEnabled && (
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await signIn("resend", {
                      email: formData.get("email"),
                      redirectTo: "/dashboard",
                    });
                  }}
                  className="flex flex-col gap-2"
                >
                  <Input type="email" name="email" required placeholder="tu@correo.com" />
                  <Button type="submit" variant="secondary" className="w-full">
                    Enviarme un enlace de acceso
                  </Button>
                </form>
              )}
            </div>
          )}

          <TrustSeal />
        </div>
      </main>
    </div>
  );
}
