import type { Metadata } from "next";
import { SubscriptionsPage } from "@/features/subscriptions/components/subscriptions-page";

export const metadata: Metadata = {
  title: "Subscriptions - Amul Stock Notifier",
};

export default function Page() {
  return <SubscriptionsPage />;
}
