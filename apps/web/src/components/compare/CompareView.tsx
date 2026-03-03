"use client";

import type { ScoreResponse } from "@/types";
import { CATEGORY_LABELS, GRADE_COLORS } from "@/types";

interface CompareViewProps {
  locations: ScoreResponse[];
}

export function CompareView({ locations }: CompareViewProps) {
  if (locations.length < 2) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Click on the map to select locations to compare
        <br />
        <span className="text-xs text-gray-400">
          ({locations.length}/2 selected)
        </span>
      </div>
    );
  }

  const categories = locations[0].category_scores
    .filter((cs) => cs.weight > 0)
    .map((cs) => cs.category);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800">Location Comparison</h2>

      {/* Overall scores */}
      <div className="mt-4 flex gap-3">
        {locations.map((loc, i) => (
          <div
            key={i}
            className="flex-1 rounded-xl p-3 text-center text-white"
            style={{ backgroundColor: GRADE_COLORS[loc.grade] || "#6B7280" }}
          >
            <div className="text-2xl font-bold">{Math.round(loc.overall)}</div>
            <div className="text-xs font-medium opacity-90">{loc.grade}</div>
            <div className="mt-1 text-xs opacity-75">
              {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
            </div>
          </div>
        ))}
      </div>

      {/* Category comparison table */}
      <div className="mt-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-medium text-gray-500">Category</th>
              {locations.map((_, i) => (
                <th key={i} className="py-2 text-right font-medium text-gray-500">
                  Location {i + 1}
                </th>
              ))}
              <th className="py-2 text-right font-medium text-gray-500">Diff</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const scores = locations.map(
                (loc) => loc.category_scores.find((cs) => cs.category === cat)?.score ?? 0
              );
              const diff = scores.length >= 2 ? scores[0] - scores[1] : 0;

              return (
                <tr key={cat} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-600">
                    {CATEGORY_LABELS[cat] || cat}
                  </td>
                  {scores.map((s, i) => (
                    <td key={i} className="py-1.5 text-right font-medium text-gray-700">
                      {Math.round(s)}
                    </td>
                  ))}
                  <td
                    className={`py-1.5 text-right font-medium ${
                      diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {Math.round(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
