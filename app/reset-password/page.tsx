import type { Metadata } from "next";
import { ResetPasswordPage } from "@/features/availability/reset-password-page";

export const metadata: Metadata = {
  title: "Reset password - Amul Stock Notifier",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 w-full">
      <ResetPasswordPage token={token ?? null} />
    </div>
  );
}
