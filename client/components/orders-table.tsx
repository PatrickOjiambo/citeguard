import type { Order } from "@/lib/types";
import { timeAgo, truncateMiddle, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<Order["status"], string> = {
  cleared: "bg-label-supported/10 text-label-supported border-label-supported/25",
  delivering: "bg-primary/10 text-primary border-primary/25",
  locked: "bg-muted text-muted-foreground border-border",
  disputed: "bg-label-contradicted/10 text-label-contradicted border-label-contradicted/25",
  rejected: "bg-label-contradicted/10 text-label-contradicted border-label-contradicted/25",
  expired: "bg-label-unsupported/10 text-label-unsupported border-label-unsupported/25",
};

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No CAP orders yet. Orders appear here as agents call CiteGuard.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Order</th>
            <th className="px-4 py-2.5 font-medium">Buyer</th>
            <th className="px-4 py-2.5 font-medium">Counterparty</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">USDC</th>
            <th className="px-4 py-2.5 text-right font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.capOrderId} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5 font-mono text-xs">{truncateMiddle(o.capOrderId, 6, 4)}</td>
              <td className="px-4 py-2.5 font-mono text-xs">
                <span className="flex items-center gap-1.5">
                  {truncateMiddle(o.buyerWallet)}
                  {o.selfTrade && (
                    <span className="rounded bg-label-unsupported/15 px-1 text-[10px] text-label-unsupported">
                      self
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs">{truncateMiddle(o.counterpartyAgentId)}</td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_STYLES[o.status],
                  )}
                >
                  {o.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {usd(o.earnedUsdc || o.priceUsdc)}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                {timeAgo(o.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
