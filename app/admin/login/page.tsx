import type { Metadata } from "next";
import { AdminLoginPage } from "@/features/admin/components/admin-login-page";

export const metadata: Metadata = { title: "Admin Login - Amul Stock Tracker" };

export default function Page() {
  return <AdminLoginPage />;
}
