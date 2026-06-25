"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, History, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { trustBand } from "@/lib/labels";
import { timeAgo } from "@/lib/format";
import { readHistory, type HistoryEntry } from "@/lib/history";

type Filter = "all" | "trustworthy" | "mixed" | "low";

export default function VerdictsPage() {
  const router = useRouter();
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [lookup, setLookup] = React.useState("");

  // One-time sync from localStorage after mount (avoids SSR hydration mismatch).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setHistory(readHistory()), []);

  const filtered = history.filter((e) => {
    if (filter === "all") return true;
    if (filter === "trustworthy") return e.trustScore >= 75;
    if (filter === "mixed") return e.trustScore >= 50 && e.trustScore < 75;
    return e.trustScore < 50;
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verdict history</h1>
        <p className="text-sm text-muted-foreground">
          Verdicts you&apos;ve viewed on this device. Look up any verdict by its ID.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (lookup.trim()) router.push(`/verdict/${lookup.trim()}`);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="Enter a verdict ID…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" disabled={!lookup.trim()}>
          Open <ArrowRight />
        </Button>
      </form>

      <div className="flex gap-1.5">
        {(["all", "trustworthy", "mixed", "low"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors " +
              (filter === f
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <History className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No verdicts yet. Run a verification to start your history.
          </p>
          <Button asChild size="sm">
            <Link href="/verify">Verify content</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => {
            const band = trustBand(entry.trustScore);
            return (
              <Link key={entry.id} href={`/verdict/${entry.id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={
                        "flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums " +
                        band.bg +
                        " " +
                        band.text
                      }
                    >
                      {Math.round(entry.trustScore)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{entry.summary}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {entry.id.slice(0, 12)}… · {timeAgo(new Date(entry.viewedAt).toISOString())}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
