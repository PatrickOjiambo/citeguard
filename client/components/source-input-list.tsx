"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import type { SourceInput, SourceType } from "@/lib/types";

export function SourceInputList({
  sources,
  onChange,
}: {
  sources: SourceInput[];
  onChange: (next: SourceInput[]) => void;
}) {
  function update(index: number, patch: Partial<SourceInput>) {
    onChange(sources.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function add() {
    onChange([...sources, { type: "url", value: "" }]);
  }
  function remove(index: number) {
    onChange(sources.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>Sources</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus /> Add source
        </Button>
      </div>

      {sources.map((source, i) => (
        <div key={i} className="flex items-start gap-2">
          <Select
            value={source.type}
            onChange={(e) => update(i, { type: e.target.value as SourceType })}
            className="h-9 w-20 shrink-0"
          >
            <option value="url">URL</option>
            <option value="text">Text</option>
          </Select>

          {source.type === "url" ? (
            <Input
              value={source.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="https://source.example/article"
              className="flex-1"
            />
          ) : (
            <textarea
              value={source.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="Paste the source text…"
              rows={2}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            disabled={sources.length === 1}
            aria-label="Remove source"
            className="shrink-0"
          >
            <X />
          </Button>
        </div>
      ))}
    </div>
  );
}
