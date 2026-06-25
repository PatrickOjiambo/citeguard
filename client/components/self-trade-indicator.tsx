import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Green if low, amber/red as the self-trade ratio rises — surfaces DQ risk
// at a glance.
function band(ratio: number) {
  if (ratio >= 0.5)
    return {
      tone: "text-label-contradicted",
      bg: "bg-label-contradicted/10",
      ring: "border-label-contradicted/25",
      label: "High self-trade risk",
      Icon: ShieldAlert,
      note: "Most volume is your own wallets — disqualification risk.",
    };
  if (ratio >= 0.2)
    return {
      tone: "text-label-unsupported",
      bg: "bg-label-unsupported/10",
      ring: "border-label-unsupported/25",
      label: "Watch self-trade",
      Icon: AlertTriangle,
      note: "Some volume is concentrated in your own wallets.",
    };
  return {
    tone: "text-label-supported",
    bg: "bg-label-supported/10",
    ring: "border-label-supported/25",
    label: "Healthy diversity",
    Icon: ShieldCheck,
    note: "Volume is well distributed across external buyers.",
  };
}

export function SelfTradeIndicator({ ratio }: { ratio: number }) {
  const b = band(ratio);
  const pct = Math.round(ratio * 100);

  return (
    <Card className={cn("flex items-center gap-4 border p-5", b.ring, b.bg)}>
      <span className={cn("flex size-10 items-center justify-center rounded-xl bg-background/60", b.tone)}>
        <b.Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm font-semibold", b.tone)}>{b.label}</span>
          <span className={cn("text-sm font-semibold tabular-nums", b.tone)}>{pct}%</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{b.note}</p>
      </div>
    </Card>
  );
}
