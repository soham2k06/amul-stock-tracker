import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { prisma } from "./prisma";

// Login is username-based. better-auth's core still requires an `email` on
// every user record, so sign-up sends a synthetic, never-contacted address
// (see sign-in-dialog.tsx) - hence username needs to accept the wider
// character set of a legacy account's email-shaped username too.
const usernamePattern = /^[a-zA-Z0-9_.@+-]+$/;

export const auth = betterAuth({
  rateLimit: {
    storage: "database",
    window: 60 * 1000, // 1 minute
    max: 10, // 10 requests per window
    customRules: {
      "/sign-up/email": {
        window: 60 * 1000, // 1 minute
        max: 1, // 1 request per window
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  user: {
    additionalFields: {
      pincode: {
        type: "string" as const,
        required: false,
        returned: true,
        input: true,
      },
    },
  },
  plugins: [
    username({
      usernameValidator: (value) => usernamePattern.test(value),
    }),
  ],
});
