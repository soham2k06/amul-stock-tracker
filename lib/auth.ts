import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  rateLimit: {
    storage: "memory",
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
});
