"use client";

/**
 * Lightweight, theme-aware bar chart (no charting dependency). Renders crisp
 * SVG bars using CSS variables so it looks right in both light and dark themes.
 */
export interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  height = 160,
  unit = "",
}: {
  data: BarDatum[];
  height?: number;
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 8;
  const barWidth = 100 / data.length;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        style={{ width: "100%", height }}
        role="img"
        aria-label="Bar chart"
      >
        {data.map((d, i) => {
          const h = (d.value / max) * 36;
          const x = i * barWidth + gap / data.length;
          const w = barWidth - (gap / data.length) * 2;
          return (
            <rect
              key={i}
              x={x}
              y={40 - h}
              width={w}
              height={Math.max(h, 0.5)}
              rx={0.6}
              fill="hsl(var(--primary))"
              opacity={0.85}
            >
              <title>{`${d.label}: ${d.value}${unit}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
