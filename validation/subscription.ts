import { z } from "zod";

export const createSubscriptionSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
});

export const subscriptionQuerySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
