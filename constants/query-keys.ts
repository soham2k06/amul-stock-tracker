export const QUERY_KEYS = {
  availability: (params: {
    pincode: string;
    q?: string;
    start: number;
    limit: number;
  }) => ["availability", params] as const,

  pincodes: (q: string) => ["pincodes", { q }] as const,
};
