import { z } from "zod";

export const requestPasswordResetSchema = z.object({
  email: z.email(),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type ConfirmPasswordResetInput = z.infer<
  typeof confirmPasswordResetSchema
>;
