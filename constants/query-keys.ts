export const QUERY_KEYS = {
  availability: (params: {
    pincode: string;
    category: string;
    q?: string;
    start: number;
    limit: number;
  }) => ["availability", params] as const,

  pincodes: (q: string) => ["pincodes", { q }] as const,

  subscriptions: (params: { pincode: string }) =>
    ["subscriptions", params] as const,

  allSubscriptions: () => ["subscriptions", "all"] as const,

  telegramStatus: () => ["telegram", "status"] as const,

  emailStatus: () => ["email", "status"] as const,

  channelsStatus: () => ["channels", "status"] as const,

  coupons: () => ["coupons"] as const,

  adminUsers: (params: { q: string; page: number }) =>
    ["admin", "users", params] as const,

  adminUser: (params: { id: string }) =>
    ["admin", "users", "detail", params] as const,

  adminSubscriptions: (params: { q: string; pincode: string; page: number }) =>
    ["admin", "subscriptions", params] as const,

  adminNotifications: (params: {
    channel: string;
    status: string;
    page: number;
  }) => ["admin", "notifications", params] as const,

  adminAnalytics: () => ["admin", "analytics"] as const,
};
