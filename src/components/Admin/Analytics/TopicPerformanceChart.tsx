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

const TOPIC_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#3b82f6",
];

const TopicPerformanceChart = memo(function TopicPerformanceChart({
  data,
}: {
  data: { topic: string; avgCorrectPct: number; questionCount: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="currentColor"
          className="text-border/20"
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: "currentColor", fontSize: 10 }}
          unit="%"
          className="text-muted-foreground"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="topic"
          type="category"
          tick={{ fill: "currentColor", fontSize: 10 }}
          width={100}
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
          formatter={(value, _name, props) => [
            `${value}% (${(props as any).payload.questionCount} Qs)`,
            "Avg Correct",
          ]}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="avgCorrectPct" radius={[0, 2, 2, 0]} barSize={20}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={TOPIC_COLORS[index % TOPIC_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

export default TopicPerformanceChart;
