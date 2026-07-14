import type { Metadata } from "next";
import { AdminNotificationsPage } from "@/features/admin/components/admin-notifications-page";

export const metadata: Metadata = { title: "Notifications - Admin" };

export default function Page() {
  return <AdminNotificationsPage />;
}
