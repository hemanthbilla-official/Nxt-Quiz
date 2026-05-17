import React, { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function scoreColor(range: string): string {
  const match = range.match(/(\d+)/);
  if (!match) return "var(--foreground)";
  const val = parseInt(match[1], 10);
  if (val < 20) return "#ef4444";
  if (val < 40) return "#f97316";
  if (val < 60) return "#f59e0b";
  if (val < 80) return "#06b6d4";
  return "#10b981";
}

const ScoreDistributionChart = memo(function ScoreDistributionChart({
  data,
}: {
  data: { range: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="currentColor"
          className="text-border/20"
        />
        <XAxis
          dataKey="range"
          tick={{ fill: "currentColor", fontSize: 10 }}
          className="text-muted-foreground"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "currentColor", fontSize: 10 }}
          allowDecimals={false}
          className="text-muted-foreground"
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--background)",
            borderColor: "var(--border)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--foreground)",
          }}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={scoreColor(entry.range)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

export default ScoreDistributionChart;
