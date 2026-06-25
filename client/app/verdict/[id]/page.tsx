"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

import { VerdictReport } from "@/components/verdict-report";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { recordVerdict } from "@/lib/history";

export default function VerdictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const query = useQuery({
    queryKey: ["verdict", id],
    queryFn: () => api.getVerdict(id),
  });

  React.useEffect(() => {
    if (query.data) {
      recordVerdict({
        id,
        trustScore: query.data.trustScore,
        summary: query.data.summary,
      });
    }
  }, [query.data, id]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/verify"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> New verification
      </Link>

      {query.isLoading && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading verdict…
        </div>
      )}

      {query.isError && (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <AlertCircle className="size-8 text-label-contradicted" />
          <div>
            <p className="font-medium">Verdict not found</p>
            <p className="text-sm text-muted-foreground">
              This verdict may have expired or the ID is incorrect.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/verify">Run a new verification</Link>
          </Button>
        </div>
      )}

      {query.data && <VerdictReport verdict={query.data} id={id} />}
    </div>
  );
}
