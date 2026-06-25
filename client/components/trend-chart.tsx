"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Order } from "@/lib/types";
import { usd } from "@/lib/format";

// Build a cumulative earnings + cleared-count series from cleared orders.
function buildSeries(orders: Order[]) {
  const cleared = orders
    .filter((o) => o.status === "cleared" && o.createdAt)
    .sort(
      (a, b) =>
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime(),
    );

  const byDay = new Map<string, { earned: number; count: number }>();
  for (const o of cleared) {
    const day = new Date(o.createdAt!).toISOString().slice(0, 10);
    const prev = byDay.get(day) ?? { earned: 0, count: 0 };
    byDay.set(day, {
      earned: prev.earned + (o.earnedUsdc ?? o.priceUsdc ?? 0),
      count: prev.count + 1,
    });
  }

  let cumEarned = 0;
  let cumCount = 0;
  return [...byDay.entries()].map(([day, v]) => {
    cumEarned += v.earned;
    cumCount += v.count;
    return {
      day: day.slice(5),
      earned: Number(cumEarned.toFixed(2)),
      cleared: cumCount,
    };
  });
}

export function TrendChart({ orders }: { orders: Order[] }) {
  const data = buildSeries(orders);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No cleared orders yet — the earnings trend appears here.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="earned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              fontSize: 12,
            }}
            formatter={(value) => [usd(Number(value)), "Cumulative earned"]}
          />
          <Area
            type="monotone"
            dataKey="earned"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#earned)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
