"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, Coins, Loader2, Users, Wallet } from "lucide-react";

import { DashboardGate } from "@/components/dashboard-gate";
import { MetricCard } from "@/components/metric-card";
import { OrdersTable } from "@/components/orders-table";
import { SelfTradeIndicator } from "@/components/self-trade-indicator";
import { TrendChart } from "@/components/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { usd } from "@/lib/format";

export default function DashboardPage() {
  return (
    <DashboardGate>
      <Dashboard />
    </DashboardGate>
  );
}

function Dashboard() {
  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: api.getMetrics,
    refetchInterval: 15_000,
  });
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(100),
    refetchInterval: 15_000,
  });

  const m = metrics.data;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Builder dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Orders, earnings, and reward-eligibility metrics — live.
        </p>
      </div>

      {metrics.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Could not load metrics. Is the backend running at the configured API URL?
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metrics panel */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Unique counterparties"
              value={m?.uniqueCounterparties ?? "—"}
              icon={<Users className="size-4" />}
              target={3}
              current={m?.uniqueCounterparties ?? 0}
              met={m?.eligibility?.counterpartiesMet ?? (m?.uniqueCounterparties ?? 0) >= 3}
            />
            <MetricCard
              label="Unique buyers"
              value={m?.uniqueBuyers ?? "—"}
              icon={<Wallet className="size-4" />}
              target={5}
              current={m?.uniqueBuyers ?? 0}
              met={m?.eligibility?.buyersMet ?? (m?.uniqueBuyers ?? 0) >= 5}
            />
            <MetricCard
              label="Total earned"
              value={usd(m?.totalEarnedUsdc)}
              sublabel="USDC"
              icon={<Coins className="size-4" />}
            />
            <MetricCard
              label="Reputation (PTS)"
              value={m?.currentPts ?? "—"}
              sublabel={`${m?.totalCleared ?? 0} cleared`}
              icon={<Award className="size-4" />}
            />
          </div>

          <SelfTradeIndicator ratio={m?.selfTradeRatio ?? 0} />

          {/* Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Cumulative earnings</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.data ? (
                <TrendChart orders={orders.data.orders} />
              ) : (
                <div className="flex h-56 items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Recent orders
            </h2>
            {orders.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading orders…
              </div>
            ) : orders.isError ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Could not load orders.
                </CardContent>
              </Card>
            ) : (
              <OrdersTable orders={orders.data?.orders ?? []} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
