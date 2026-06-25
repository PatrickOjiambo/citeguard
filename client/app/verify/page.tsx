"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

import { SourceInputList } from "@/components/source-input-list";
import { TrustScoreBadge } from "@/components/trust-score-badge";
import { ClaimRow } from "@/components/claim-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import type { SourceInput, VerifyResponse } from "@/lib/types";

const PROGRESS = [
  "Reading sources…",
  "Extracting atomic claims…",
  "Grounding each claim against the sources…",
  "Scoring & assembling the verdict…",
];

export default function VerifyPage() {
  const router = useRouter();
  const [content, setContent] = React.useState("");
  const [sources, setSources] = React.useState<SourceInput[]>([
    { type: "url", value: "" },
  ]);
  const [allowWebCrossCheck, setAllowWebCrossCheck] = React.useState(false);
  const [inlineResult, setInlineResult] = React.useState<VerifyResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.verify({
        content: content.trim(),
        sources: sources
          .filter((s) => s.value.trim())
          .map((s) => ({ type: s.type, value: s.value.trim() })),
        options: { allowWebCrossCheck },
      }),
    onSuccess: (res) => {
      if (res.verdictId) router.push(`/verdict/${res.verdictId}`);
      else setInlineResult(res);
    },
  });

  const canSubmit =
    content.trim().length > 0 && sources.some((s) => s.value.trim().length > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setInlineResult(null);
    mutation.mutate();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Verify content</h1>
        <p className="text-sm text-muted-foreground">
          Paste the text to check and the sources it cites. CiteGuard grounds every
          claim and returns a trust verdict.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="content">Content to verify</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            placeholder="Paste the claim or passage you want checked against its sources…"
          />
        </div>

        <SourceInputList sources={sources} onChange={setSources} />

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={allowWebCrossCheck}
            onChange={(e) => setAllowWebCrossCheck(e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          <span className="text-muted-foreground">
            Allow web cross-check{" "}
            <span className="text-xs opacity-70">(supplement provided sources)</span>
          </span>
        </label>

        {mutation.isError && (
          <Card className="border-label-contradicted/25 bg-label-contradicted/5">
            <CardContent className="flex items-start gap-2.5 p-4">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-label-contradicted" />
              <div className="text-sm">
                <p className="font-medium text-label-contradicted">Verification failed</p>
                <p className="text-muted-foreground">
                  {mutation.error instanceof ApiError
                    ? mutation.error.message
                    : "Something went wrong. Please try again."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button type="submit" size="lg" className="h-10 px-4" disabled={!canSubmit || mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="animate-spin" /> Verifying…
            </>
          ) : (
            <>
              <Sparkles /> Run verification
            </>
          )}
        </Button>
      </form>

      {mutation.isPending && <ProgressCard />}

      {inlineResult && (
        <div className="flex flex-col gap-4 border-t border-border pt-8">
          <div className="flex items-center gap-4">
            <TrustScoreBadge score={inlineResult.verdict.trustScore} size={96} />
            <p className="text-sm text-muted-foreground">{inlineResult.verdict.summary}</p>
          </div>
          <div className="flex flex-col gap-3">
            {inlineResult.verdict.claims.map((claim, i) => (
              <ClaimRow key={i} claim={claim} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressCard() {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, PROGRESS.length - 1)),
      1400,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        {PROGRESS.map((text, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            {i < step ? (
              <span className="flex size-4 items-center justify-center rounded-full bg-label-supported/15 text-label-supported text-[10px]">
                ✓
              </span>
            ) : i === step ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <span className="size-4 rounded-full border border-border" />
            )}
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>
              {text}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
