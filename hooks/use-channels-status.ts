"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";

type ChannelsStatus = {
  hasAnyChannel: boolean;
  email: boolean;
  telegram: boolean;
  push: boolean;
};

export function useChannelsStatus(enabled: boolean) {
  const { data, isLoading } = useQuery<ChannelsStatus>({
    queryKey: QUERY_KEYS.channelsStatus(),
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/notifications/channels-status", {
        signal,
      });
      if (!res.ok)
        return { hasAnyChannel: true, email: false, telegram: false, push: false };
      return res.json();
    },
    enabled,
  });

  return {
    hasAnyChannel: data?.hasAnyChannel ?? true,
    isLoading,
  };
}
