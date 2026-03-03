"use client";

import { useState } from "react";
import { CATEGORY_LABELS } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS);

const PRESETS = [
  { slug: "default", name: "Balanced" },
  { slug: "family", name: "Family" },
  { slug: "young_professional", name: "Young Professional" },
  { slug: "retiree", name: "Retiree" },
];

interface WeightSlidersProps {
  preset: string;
  onPresetChange: (preset: string) => void;
  customWeights: Record<string, number> | null;
  onWeightsChange: (weights: Record<string, number> | null) => void;
}

export function WeightSliders({
  preset,
  onPresetChange,
  customWeights,
  onWeightsChange,
}: WeightSlidersProps) {
  const [expanded, setExpanded] = useState(false);

  const handlePreset = (slug: string) => {
    onPresetChange(slug);
    onWeightsChange(null);
  };

  const handleSlider = (category: string, value: number) => {
    const weights = customWeights || Object.fromEntries(CATEGORIES.map((c) => [c, 1.0]));
    onWeightsChange({ ...weights, [category]: value });
    onPresetChange("custom");
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600">Scoring Profile</h3>

      {/* Preset buttons */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.slug}
            onClick={() => handlePreset(p.slug)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              preset === p.slug
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Custom sliders toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-brand-600 hover:underline"
      >
        {expanded ? "Hide custom weights" : "Customize weights"}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {CATEGORIES.map((cat) => {
            const value = customWeights?.[cat] ?? 1.0;
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className="w-24 truncate text-xs text-gray-600">
                  {CATEGORY_LABELS[cat]}
                </span>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.5"
                  value={value}
                  onChange={(e) => handleSlider(cat, parseFloat(e.target.value))}
                  className="flex-1 accent-brand-600"
                />
                <span className="w-6 text-right text-xs text-gray-500">
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
