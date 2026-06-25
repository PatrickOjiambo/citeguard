import type { ClaimLabel } from "./types";

// Single source of truth for label presentation — colors must stay consistent
// everywhere: supported = green, contradicted = red, unsupported = amber,
// not_enough_info = grey.
export const LABEL_CONFIG: Record<
  ClaimLabel,
  { text: string; dot: string; chip: string; bar: string }
> = {
  supported: {
    text: "Supported",
    dot: "bg-label-supported",
    chip: "bg-label-supported/10 text-label-supported border-label-supported/25",
    bar: "bg-label-supported",
  },
  contradicted: {
    text: "Contradicted",
    dot: "bg-label-contradicted",
    chip: "bg-label-contradicted/10 text-label-contradicted border-label-contradicted/25",
    bar: "bg-label-contradicted",
  },
  unsupported: {
    text: "Unsupported",
    dot: "bg-label-unsupported",
    chip: "bg-label-unsupported/10 text-label-unsupported border-label-unsupported/25",
    bar: "bg-label-unsupported",
  },
  not_enough_info: {
    text: "Not enough info",
    dot: "bg-label-nei",
    chip: "bg-label-nei/10 text-label-nei border-label-nei/25",
    bar: "bg-label-nei",
  },
};

// Trust-score color band: red < 50 <= amber < 75 <= green.
export function trustBand(score: number): {
  label: string;
  text: string;
  ring: string;
  bg: string;
} {
  if (score >= 75)
    return { label: "Trustworthy", text: "text-label-supported", ring: "text-label-supported", bg: "bg-label-supported/10" };
  if (score >= 50)
    return { label: "Mixed", text: "text-label-unsupported", ring: "text-label-unsupported", bg: "bg-label-unsupported/10" };
  return { label: "Low trust", text: "text-label-contradicted", ring: "text-label-contradicted", bg: "bg-label-contradicted/10" };
}
