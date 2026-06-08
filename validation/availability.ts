import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";

const categoryAliases = CATEGORIES.map((c) => c.alias) as [string, ...string[]];

export const availabilitySearchSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  q: z.string().max(100, "Search term too long").optional(),
  category: z.enum(categoryAliases).default("protein"),
  start: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(32).default(8),
});

export type AvailabilitySearchInput = z.infer<typeof availabilitySearchSchema>;
