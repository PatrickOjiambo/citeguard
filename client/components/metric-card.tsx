import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sublabel,
  target,
  current,
  met,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  target?: number;
  current?: number;
  met?: boolean;
  icon?: React.ReactNode;
}) {
  const showProgress = typeof target === "number" && typeof current === "number";
  const pct = showProgress ? Math.min(100, (current! / target!) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>

      {showProgress && (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                met ? "bg-label-supported" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {met ? (
              <span className="text-label-supported">✓ Target of ≥{target} met</span>
            ) : (
              <>
                {current} of ≥{target} required
              </>
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
