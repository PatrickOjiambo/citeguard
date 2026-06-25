import { trustBand } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function TrustScoreBadge({
  score,
  size = 140,
}: {
  score: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = trustBand(clamped);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="9"
          className="stroke-muted"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-700", band.ring)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-semibold tabular-nums", band.text)}>
          {clamped}
        </span>
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Trust score
        </span>
      </div>
    </div>
  );
}
