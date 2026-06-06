import { z } from "zod";

export const availabilitySearchSchema = z.object({
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  q: z.string().max(100, "Search term too long").optional(),
});

export type AvailabilitySearchInput = z.infer<typeof availabilitySearchSchema>;
