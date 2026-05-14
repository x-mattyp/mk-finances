import type { CategoryScale, Chart, Plugin } from "chart.js";

const TICK = "#7a7870";
const GRID = "rgba(255,255,255,0.05)";

export const CHART_FONT =
  "var(--font-dm-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

export function applyChartDefaults(ChartCtor: typeof import("chart.js").Chart) {
  ChartCtor.defaults.color = TICK;
  ChartCtor.defaults.borderColor = GRID;
  ChartCtor.defaults.font.family = CHART_FONT;
  ChartCtor.defaults.font.size = 11;
  ChartCtor.defaults.plugins.legend.labels.usePointStyle = true;
  ChartCtor.defaults.plugins.legend.labels.boxWidth = 8;
  ChartCtor.defaults.plugins.tooltip.backgroundColor = "#161714";
  ChartCtor.defaults.plugins.tooltip.titleColor = "#e8e6df";
  ChartCtor.defaults.plugins.tooltip.bodyColor = "#c8f060";
  ChartCtor.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,0.07)";
  ChartCtor.defaults.plugins.tooltip.borderWidth = 1;
  ChartCtor.defaults.plugins.tooltip.cornerRadius = 3;
  ChartCtor.defaults.plugins.tooltip.padding = 10;
  ChartCtor.defaults.elements.bar.borderRadius = 3;
}

function drawYearDivider(chart: Chart, first2026Index: number | null) {
  if (first2026Index === null || first2026Index <= 0) return;
  const xScale = chart.scales.x;
  if (!xScale || !("getPixelForTick" in xScale)) return;
  const cat = xScale as CategoryScale;
  const i = first2026Index;
  const xPrev = cat.getPixelForTick(i - 1);
  const xNext = cat.getPixelForTick(i);
  if (xPrev === undefined || xNext === undefined) return;
  const x = (xPrev + xNext) / 2;
  const { top, bottom, left, right } = chart.chartArea;
  const ctx = chart.ctx;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = TICK;
  ctx.font = `10px ${CHART_FONT}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "right";
  ctx.fillText("2025", Math.max(left + 2, x - 6), top + 4);
  ctx.textAlign = "left";
  ctx.fillText("2026", Math.min(right - 2, x + 6), top + 4);
  ctx.restore();
}

/** Vertical dashed divider between 2025 and 2026 (bar charts). */
export function yearDividerPluginBar(
  first2026Index: number | null,
): Plugin<"bar"> {
  return {
    id: "yearDivider",
    afterDatasetsDraw(chart) {
      drawYearDivider(chart, first2026Index);
    },
  } as Plugin<"bar">;
}

/** Vertical dashed divider between 2025 and 2026 (line charts). */
export function yearDividerPluginLine(
  first2026Index: number | null,
): Plugin<"line"> {
  return {
    id: "yearDivider",
    afterDatasetsDraw(chart) {
      drawYearDivider(chart, first2026Index);
    },
  } as Plugin<"line">;
}
