import type { Metadata } from "next";
import { AvailabilityPage } from "@/features/availability/components/availability-page";

export const metadata: Metadata = {
  title: "Amul Stock Tracker",
};

export default function Home() {
  return <AvailabilityPage />;
}
