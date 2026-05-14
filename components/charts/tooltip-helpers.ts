import type { TooltipItem } from "chart.js";
import { formatCurrencyTooltip } from "@/lib/format";

export function tooltipDollarLabel(context: TooltipItem<"bar" | "line">) {
  const raw = context.parsed;
  const y =
    typeof raw === "number"
      ? raw
      : raw && typeof raw === "object" && "y" in raw
        ? (raw as { y: number }).y
        : 0;
  return `${context.dataset.label ?? ""}: ${formatCurrencyTooltip(y)}`;
}

export function tooltipDollarFooterTotal(_items: TooltipItem<"bar">[], dataIndex: number, getTotal: (i: number) => number) {
  return `Total: ${formatCurrencyTooltip(getTotal(dataIndex))}`;
}
