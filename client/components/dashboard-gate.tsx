"use client";

import * as React from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";

// Lightweight hackathon auth gate. If NEXT_PUBLIC_DASHBOARD_PASSPHRASE is unset,
// the dashboard is open. Otherwise a passphrase unlocks it (stored locally).
const PASSPHRASE = process.env.NEXT_PUBLIC_DASHBOARD_PASSPHRASE ?? "";
const KEY = "citeguard.dashboard.unlocked";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = React.useState(!PASSPHRASE);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // One-time sync from localStorage after mount (avoids SSR hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (PASSPHRASE && localStorage.getItem(KEY) === PASSPHRASE) setUnlocked(true);
  }, []);

  if (unlocked) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PASSPHRASE) {
      localStorage.setItem(KEY, value);
      setUnlocked(true);
    } else {
      setError(true);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 py-20">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Lock className="size-5" />
      </span>
      <div className="text-center">
        <h1 className="text-lg font-semibold">Builder dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Enter the passphrase to view orders and metrics.
        </p>
      </div>
      <Card className="w-full">
        <CardContent className="p-5">
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pass">Passphrase</Label>
              <Input
                id="pass"
                type="password"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(false);
                }}
                autoFocus
              />
              {error && (
                <span className="text-xs text-label-contradicted">Incorrect passphrase.</span>
              )}
            </div>
            <Button type="submit">Unlock</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
