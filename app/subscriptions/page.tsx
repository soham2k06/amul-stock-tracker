import type { Metadata } from "next";
import { SubscriptionsPage } from "@/features/subscriptions/components/subscriptions-page";
import { getServerSession } from "@/lib/get-server-session";

export const metadata: Metadata = {
  title: "Subscriptions - Amul Stock Notifier",
};

export default async function Page() {
  const session = await getServerSession();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 w-full">
      <SubscriptionsPage initialSession={session} />
    </div>
  );
}
