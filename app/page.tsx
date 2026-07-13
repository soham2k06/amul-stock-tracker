import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage } from "@/features/availability/home-page";
import { getServerSession } from "@/lib/get-server-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Amul Stock Notifier",
};

export default async function Home() {
  const session = await getServerSession();

  return (
    <Suspense>
      <HomePage initialSession={session} />
    </Suspense>
  );
}
