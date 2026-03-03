"use client";

import type { ScoreResponse } from "@/types";
import { CATEGORY_LABELS, GRADE_COLORS } from "@/types";
import { ScoreRadarChart } from "./ScoreRadarChart";

interface ScorePanelProps {
  score: ScoreResponse;
  loading?: boolean;
}

export function ScorePanel({ score, loading }: ScorePanelProps) {
  const gradeColor = GRADE_COLORS[score.grade] || "#6B7280";

  return (
    <div className="p-4">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {/* Overall Score */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: gradeColor }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(score.overall)}</div>
            <div className="text-xs font-medium opacity-90">{score.grade}</div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Livability Score</h2>
          <p className="text-sm text-gray-500">
            {score.lat.toFixed(4)}, {score.lng.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="mt-4">
        <ScoreRadarChart categories={score.category_scores} />
      </div>

      {/* Category Breakdown */}
      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-600">Category Breakdown</h3>
        {score.category_scores
          .filter((cs) => cs.weight > 0)
          .sort((a, b) => b.score - a.score)
          .map((cs) => (
            <div key={cs.category} className="flex items-center gap-3">
              <div className="w-28 truncate text-xs text-gray-600">
                {CATEGORY_LABELS[cs.category] || cs.category}
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cs.score}%`,
                      backgroundColor:
                        cs.score >= 70 ? "#16A34A" : cs.score >= 40 ? "#CA8A04" : "#DC2626",
                    }}
                  />
                </div>
              </div>
              <div className="w-8 text-right text-xs font-medium text-gray-700">
                {Math.round(cs.score)}
              </div>
              <div className="w-14 text-right text-xs text-gray-400">
                {cs.amenity_count} found
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
