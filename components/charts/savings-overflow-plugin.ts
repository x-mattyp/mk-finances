import type { Chart, Plugin } from "chart.js";
import { CHART_FONT } from "@/lib/chart-theme";
import { formatCurrencyTooltip } from "@/lib/format";

/** ~p-th percentile along sorted values (p=90 → high but usually below a single max outlier). */
export function percentileNearest(values: number[], p: number): number {
  const s = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (s.length === 0) return 0;
  if (s.length === 1) return s[0]!;
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * (s.length - 1)));
  return s[idx]!;
}

export function monthlySavingsTotals(
  btc: number[],
  ira: number[],
  fund: number[],
): number[] {
  const n = Math.max(btc.length, ira.length, fund.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      (btc[i] ?? 0) + (ira[i] ?? 0) + (fund[i] ?? 0),
    );
  }
  return out;
}

const ACCENT = "#c8f060";

/**
 * After stacked bars are drawn: months whose total savings exceeds `yMax` get
 * the true total printed above the chart (bars are clipped by the Y max).
 */
export function savingsOverflowTotalLabelsPlugin(opts: {
  totals: number[];
  yMax: number;
}): Plugin<"bar"> {
  return {
    id: "savingsOverflowTotalLabels",
    afterDraw(chart: Chart<"bar">) {
      const { totals, yMax } = opts;
      if (!totals.length || yMax <= 0) return;

      const meta0 = chart.getDatasetMeta(0);
      if (!meta0?.data?.length) return;

      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = `11px ${CHART_FONT}`;
      ctx.fillStyle = ACCENT;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      for (let i = 0; i < totals.length; i++) {
        const t = totals[i]!;
        if (!Number.isFinite(t) || t <= yMax) continue;
        const el = meta0.data[i];
        if (!el || typeof el.x !== "number") continue;
        const x = el.x;
        const y = chartArea.top - 6;
        ctx.fillText(formatCurrencyTooltip(t), x, y);
      }
      ctx.restore();
    },
  } as Plugin<"bar">;
}
