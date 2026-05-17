import React, { memo } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

const GradeDistributionChart = memo(function GradeDistributionChart({ data }: { data: { name: string; value: number; grade: string }[] }) {
  const COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#f97316", "#ef4444"];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: "var(--background)", borderColor: "var(--border)", borderRadius: "6px", fontSize: "12px", color: "var(--foreground)" }} />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
});

export default GradeDistributionChart;