import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { AdminNav } from "@/features/admin/components/admin-nav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const authenticated = await verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (!authenticated) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 w-full">
      <AdminNav />
      <div className="pb-16">{children}</div>
    </div>
  );
}
