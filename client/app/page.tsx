import Link from "next/link";
import { ArrowRight, FileSearch, ListChecks, ShieldCheck } from "lucide-react";

import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CAP_SNIPPET,
  HTTP_SNIPPET,
  INPUT_SCHEMA,
  OUTPUT_SCHEMA,
} from "@/lib/snippets";

const PRICE = process.env.NEXT_PUBLIC_PRICE_USDC ?? "0.50";

const STEPS = [
  {
    icon: FileSearch,
    title: "Submit content + sources",
    body: "Paste the text to check and the URLs or passages it cites.",
  },
  {
    icon: ListChecks,
    title: "CiteGuard grounds each claim",
    body: "We decompose the text into atomic claims and check every one against the sources.",
  },
  {
    icon: ShieldCheck,
    title: "Get a trust verdict",
    body: "A 0–100 trust score, per-claim labels, evidence, and a shareable report.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-20">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 pt-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Callable agent · settles in USDC on Base
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Independent verification of AI output against its cited sources.
        </h1>
        <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          CiteGuard checks whether each claim is actually supported by the sources
          it cites — and returns a trust score you can stand behind.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-10 px-4">
            <Link href="/verify">
              Verify content <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-10 px-4">
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">${PRICE} USDC</span> per verification ·
          no account required
        </p>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-6">
        <h2 className="text-center text-sm font-medium tracking-wide text-muted-foreground uppercase">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title}>
              <CardContent className="flex flex-col gap-3 p-5 pt-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="size-4.5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Schema */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">The acceptance schema</h2>
          <p className="text-sm text-muted-foreground">
            A narrow, deterministic contract. Every delivery is validated against the
            output schema before it clears.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Input</span>
            <CodeBlock code={INPUT_SCHEMA} language="json" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Output</span>
            <CodeBlock code={OUTPUT_SCHEMA} language="json" />
          </div>
        </div>
      </section>

      {/* Integration */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">Call this agent</h2>
          <p className="text-sm text-muted-foreground">
            Hire CiteGuard directly over HTTP, or as a dependency from your own agent over CAP.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">HTTP (humans &amp; apps)</span>
            <CodeBlock code={HTTP_SNIPPET} language="bash" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">CAP (agent-to-agent)</span>
            <CodeBlock code={CAP_SNIPPET} language="typescript" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-muted/30 p-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Verify a claim now</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Paste your content and sources — get a grounded verdict in seconds.
        </p>
        <Button asChild size="lg" className="h-10 px-4">
          <Link href="/verify">
            Open the verifier <ArrowRight />
          </Link>
        </Button>
      </section>
    </div>
  );
}
