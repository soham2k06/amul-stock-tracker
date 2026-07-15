"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { QUERY_KEYS } from "@/constants/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type AnalyticsResponse = {
  stats: {
    totalUsers: number;
    totalSubscriptions: number;
    notificationsLast7d: number;
  };
  channelAdoption: Array<{ channel: string; count: number }>;
  signups: Array<{ date: string; count: number }>;
  notifications: Array<{
    date: string;
    push: number;
    telegram: number;
    email: number;
  }>;
  topProducts: Array<{ productName: string; count: number }>;
};

const signupsConfig = {
  count: { label: "Signups", theme: { light: "#2a78d6", dark: "#3987e5" } },
} satisfies ChartConfig;

const notificationsConfig = {
  push: { label: "Push", theme: { light: "#2a78d6", dark: "#3987e5" } },
  telegram: { label: "Telegram", theme: { light: "#1baf7a", dark: "#199e70" } },
  email: { label: "Email", theme: { light: "#4a3aa7", dark: "#9085e9" } },
} satisfies ChartConfig;

const topProductsConfig = {
  count: { label: "Subscribers", theme: { light: "#2a78d6", dark: "#3987e5" } },
} satisfies ChartConfig;

function formatDay(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.adminAnalytics(),
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/admin/analytics", { signal });
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json() as Promise<AnalyticsResponse>;
    },
  });

  return (
    <section className="pt-10 pb-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Analytics
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Overview of users, subscriptions, and notification activity.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Total users"
          value={data?.stats.totalUsers}
          isLoading={isLoading}
        />
        <StatTile
          label="Active subscriptions"
          value={data?.stats.totalSubscriptions}
          isLoading={isLoading}
        />
        <StatTile
          label="Notifications (7d)"
          value={data?.stats.notificationsLast7d}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signups - last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="aspect-video w-full" />
            ) : (
              <ChartContainer config={signupsConfig}>
                <AreaChart data={data.signups} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDay}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => formatDay(String(v))}
                      />
                    }
                  />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="var(--color-count)"
                    fillOpacity={0.15}
                    stroke="var(--color-count)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications by channel - last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="aspect-video w-full" />
            ) : (
              <ChartContainer config={notificationsConfig}>
                <BarChart data={data.notifications} margin={{ left: -20 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDay}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => formatDay(String(v))}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="push"
                    stackId="channel"
                    fill="var(--color-push)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="telegram"
                    stackId="channel"
                    fill="var(--color-telegram)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="email"
                    stackId="channel"
                    fill="var(--color-email)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 subscribed products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="aspect-video w-full" />
            ) : data.topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No subscriptions yet
              </p>
            ) : (
              <ChartContainer config={topProductsConfig}>
                <BarChart
                  data={[...data.topProducts].sort((a, b) => b.count - a.count)}
                  layout="vertical"
                  margin={{ left: -24 }}
                >
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="productName"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={200}
                    tick={{ fontSize: 12 }}
                    // format like this amul...30ml
                    tickFormatter={(v) => {
                      const amulRemoved = v.replace(/amul/gi, "").trim();
                      // dots in the middle if more than 20 chars
                      if (amulRemoved.length > 20) {
                        return (
                          amulRemoved.slice(0, 10) +
                          "..." +
                          amulRemoved.slice(-10)
                        );
                      }
                      return amulRemoved;
                    }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel adoption</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="aspect-video w-full" />
            ) : (
              <ChartContainer config={notificationsConfig}>
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent nameKey="channel" hideLabel />
                    }
                  />
                  <ChartLegend
                    content={<ChartLegendContent nameKey="channel" />}
                  />
                  <Pie
                    data={data.channelAdoption}
                    dataKey="count"
                    nameKey="channel"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.channelAdoption.map((entry) => (
                      <Cell
                        key={entry.channel}
                        fill={`var(--color-${entry.channel})`}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number | undefined;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {isLoading || value === undefined ? (
          <Skeleton className="mt-2 h-8 w-20" />
        ) : (
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
            {value.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
