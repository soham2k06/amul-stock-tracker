import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "./query-provider";
import { Navbar } from "@/components/navbar";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amul Stock Notifier",
  description: "Check real-time Amul product availability for your pincode",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <NuqsAdapter>
            <Navbar />
            <ServiceWorkerRegistrar />
            {children}
          </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  );
}
