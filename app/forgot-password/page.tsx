import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/features/availability/forgot-password-page";

export const metadata: Metadata = {
  title: "Forgot password - Amul Stock Notifier",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 w-full">
      <ForgotPasswordPage />
    </div>
  );
}
