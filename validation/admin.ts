import { z } from "zod";

export const adminPasswordSchema = z.object({
  password: z.string().min(1),
});

export const adminOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

const pageParam = z.coerce.number().int().min(1).default(1);
const limitParam = z.coerce.number().int().min(1).max(100).default(20);

export const adminUsersQuerySchema = z.object({
  q: z.string().optional().default(""),
  page: pageParam,
  limit: limitParam,
});

export const adminSubscriptionsQuerySchema = z.object({
  q: z.string().optional().default(""),
  pincode: z.string().optional().default(""),
  page: pageParam,
  limit: limitParam,
});

export const adminNotificationsQuerySchema = z.object({
  channel: z.enum(["PUSH", "TELEGRAM", "EMAIL"]).optional(),
  status: z.enum(["SENT", "FAILED"]).optional(),
  page: pageParam,
  limit: limitParam,
});

export type AdminPasswordInput = z.infer<typeof adminPasswordSchema>;
export type AdminOtpInput = z.infer<typeof adminOtpSchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminSubscriptionsQuery = z.infer<typeof adminSubscriptionsQuerySchema>;
export type AdminNotificationsQuery = z.infer<typeof adminNotificationsQuerySchema>;
