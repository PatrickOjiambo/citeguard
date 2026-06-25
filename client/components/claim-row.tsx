import { Quote } from "lucide-react";

import { LABEL_CONFIG } from "@/lib/labels";
import type { VerdictClaim } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClaimRow({ claim, index }: { claim: VerdictClaim; index: number }) {
  const cfg = LABEL_CONFIG[claim.label];
  const confidence = Math.round(claim.confidence * 100);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="text-sm leading-relaxed text-foreground">{claim.text}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            cfg.chip,
          )}
        >
          <span className={cn("size-1.5 rounded-full", cfg.dot)} />
          {cfg.text}
        </span>
      </div>

      <div className="flex items-center gap-3 pl-7">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", cfg.bar)}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
          {confidence}% · src {claim.sourceIndex}
        </span>
      </div>

      {claim.evidence && (
        <div className="ml-7 flex gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          <Quote className="size-3.5 shrink-0 opacity-60" />
          <span className="italic">{claim.evidence}</span>
        </div>
      )}
    </div>
  );
}
