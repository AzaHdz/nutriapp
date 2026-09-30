import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email y contraseña",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").toLowerCase().trim();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      // The first admin comes from an env var, so it self-heals if the DB is recreated
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      if (adminEmail && user.email === adminEmail && user.role !== "ADMIN") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }

      if (user.status === "SUSPENDED") return null;

      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  }),
];

// Optional providers, enabled only when their env vars exist
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_RESEND_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "Planify <onboarding@resend.dev>",
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // The role in the JWT is for UI only (show/hide the Admin link);
        // real authorization always checks the DB (requireUser/requireAdmin).
        token.role = (user as { role?: Role }).role ?? "NUTRITIONIST";
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.role = (token.role as Role) ?? "NUTRITIONIST";
      return session;
    },
  },
});

/**
 * Returns the session or bails out. Call it at the top of every server action /
 * protected page. Every Prisma query must filter by this userId.
 *
 * It hits the DB on every call: the JWT lasts 30 days and cannot be revoked,
 * so this is where a suspension takes effect.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, role: true, tier: true },
  });
  if (!user || user.status === "SUSPENDED") redirect("/login?error=suspendida");

  return {
    userId: session.user.id,
    email: session.user.email,
    role: user.role,
    tier: user.tier,
  };
}

/** Like requireUser, but also requires the ADMIN role. */
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/dashboard");
  return u;
}
