import type { Metadata } from "next";
import { AdminAnalyticsPage } from "@/features/admin/components/admin-analytics-page";

export const metadata: Metadata = { title: "Analytics - Admin" };

export default function Page() {
  return <AdminAnalyticsPage />;
}
