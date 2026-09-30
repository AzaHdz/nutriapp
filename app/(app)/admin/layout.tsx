import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Redirects any account without the ADMIN role to /dashboard.
  await requireAdmin();
  return <>{children}</>;
}
