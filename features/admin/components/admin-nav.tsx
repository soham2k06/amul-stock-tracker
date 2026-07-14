"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/notifications", label: "Notifications" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b py-4">
      <div className="flex items-center gap-1">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Button
              key={link.href}
              variant={active ? "secondary" : "ghost"}
              size="sm"
              nativeButton={false}
              render={<Link href={link.href}>{link.label}</Link>}
            />
          );
        })}
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Log out
      </Button>
    </nav>
  );
}
