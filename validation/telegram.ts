import { z } from "zod";

export const telegramWebhookSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.number() }),
      text: z.string().optional(),
    })
    .optional(),
});

export type TelegramWebhookBody = z.infer<typeof telegramWebhookSchema>;
