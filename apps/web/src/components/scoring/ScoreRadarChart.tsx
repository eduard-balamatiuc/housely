"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { CategoryScore } from "@/types";
import { CATEGORY_LABELS } from "@/types";

interface ScoreRadarChartProps {
  categories: CategoryScore[];
}

export function ScoreRadarChart({ categories }: ScoreRadarChartProps) {
  const data = categories
    .filter((c) => c.weight > 0)
    .map((c) => ({
      category: (CATEGORY_LABELS[c.category] || c.category).slice(0, 12),
      score: c.score,
      fullMark: 100,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 10, fill: "#6b7280" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: "#9ca3af" }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#2f9468"
          fill="#2f9468"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
