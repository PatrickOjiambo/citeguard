"use client";

import * as React from "react";
import { Check, Flag, Link2 } from "lucide-react";

import { ClaimRow } from "@/components/claim-row";
import { CodeBlock } from "@/components/code-block";
import { TrustScoreBadge } from "@/components/trust-score-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LABEL_CONFIG, trustBand } from "@/lib/labels";
import type { ClaimLabel, Verdict } from "@/lib/types";

const ORDER: ClaimLabel[] = [
  "supported",
  "unsupported",
  "contradicted",
  "not_enough_info",
];

export function VerdictReport({ verdict, id }: { verdict: Verdict; id?: string }) {
  const band = trustBand(verdict.trustScore);
  const counts = ORDER.map((label) => ({
    label,
    count: verdict.claims.filter((c) => c.label === label).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <Card className={band.bg + " border-0"}>
        <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-center sm:gap-8">
          <TrustScoreBadge score={verdict.trustScore} />
          <div className="flex flex-col gap-3 text-center sm:text-left">
            <span
              className={
                "inline-flex w-fit items-center gap-1.5 self-center rounded-full border bg-background/60 px-2.5 py-0.5 text-xs font-medium sm:self-start " +
                band.text
              }
            >
              {band.label}
            </span>
            <p className="text-balance text-lg font-medium leading-snug">
              {verdict.summary}
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              {counts.map(({ label, count }) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span className={"size-2 rounded-full " + LABEL_CONFIG[label].dot} />
                  {count} {LABEL_CONFIG[label].text.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {verdict.claims.length} claim{verdict.claims.length === 1 ? "" : "s"} checked
        </h2>
        <CopyLinkButton />
      </div>

      {/* Claims */}
      <div className="flex flex-col gap-3">
        {verdict.claims.map((claim, i) => (
          <ClaimRow key={i} claim={claim} index={i} />
        ))}
      </div>

      {/* Flagged */}
      {verdict.flagged.length > 0 && (
        <Card className="border-label-contradicted/20">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-label-contradicted">
              <Flag className="size-4" />
              Flagged statements ({verdict.flagged.length})
            </div>
            <ul className="flex flex-col gap-2">
              {verdict.flagged.map((text, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="text-label-contradicted">•</span>
                  {text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Badge */}
      {id && <BadgeSnippet id={id} />}
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = React.useState(false);
  function copy() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check /> : <Link2 />}
      {copied ? "Copied link" : "Copy link"}
    </Button>
  );
}

function BadgeSnippet({ id }: { id: string }) {
  const base =
    typeof window !== "undefined" ? window.location.origin : "https://citeguard.app";
  const snippet = `<a href="${base}/verdict/${id}">
  <img src="${base}/badge/${id}.svg" alt="Verified by CiteGuard" />
</a>`;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Embed a “Verified by CiteGuard” badge
      </span>
      <CodeBlock code={snippet} language="html" />
    </div>
  );
}
