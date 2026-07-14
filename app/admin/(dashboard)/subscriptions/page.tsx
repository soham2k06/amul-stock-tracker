import type { Metadata } from "next";
import { AdminSubscriptionsPage } from "@/features/admin/components/admin-subscriptions-page";

export const metadata: Metadata = { title: "Subscriptions - Admin" };

export default function Page() {
  return <AdminSubscriptionsPage />;
}
