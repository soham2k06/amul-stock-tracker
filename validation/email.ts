import { z } from "zod";

export const setNotificationEmailSchema = z.object({
  email: z.email(),
});

export const emailToggleSchema = z.object({
  enabled: z.boolean(),
});

export type SetNotificationEmailInput = z.infer<
  typeof setNotificationEmailSchema
>;
export type EmailToggleInput = z.infer<typeof emailToggleSchema>;
