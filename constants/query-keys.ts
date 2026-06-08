export const QUERY_KEYS = {
  availability: (params: {
    pincode: string;
    q?: string;
    start: number;
    limit: number;
  }) => ["availability", params] as const,

  pincodes: (q: string) => ["pincodes", { q }] as const,

  subscriptions: (params: { pincode: string }) =>
    ["subscriptions", params] as const,

  allSubscriptions: () => ["subscriptions", "all"] as const,

  telegramStatus: () => ["telegram", "status"] as const,
};
