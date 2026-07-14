import type { Metadata } from "next";
import { AdminUserDetailPage } from "@/features/admin/components/admin-user-detail-page";

export const metadata: Metadata = { title: "User detail - Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetailPage id={id} />;
}
