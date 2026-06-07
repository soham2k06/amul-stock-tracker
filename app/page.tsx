import { Suspense } from "react";
import type { Metadata } from "next";
import { AvailabilityPage } from "@/features/availability/components/availability-page";

export const metadata: Metadata = {
  title: "Amul Stock Notifier",
};

export default function Home() {
  return (
    <Suspense>
      <AvailabilityPage />
    </Suspense>
  );
}
