import { z } from "zod";

export const setRecoveryEmailSchema = z.object({
  email: z.email(),
});

export type SetRecoveryEmailInput = z.infer<typeof setRecoveryEmailSchema>;
