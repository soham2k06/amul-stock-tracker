import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
