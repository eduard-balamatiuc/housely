"use client";

import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS);

interface CategoryTogglesProps {
  activeCategories: Set<string>;
  onToggle: (categories: Set<string>) => void;
}

export function CategoryToggles({ activeCategories, onToggle }: CategoryTogglesProps) {
  const toggle = (category: string) => {
    const next = new Set(activeCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    onToggle(next);
  };

  const allActive = activeCategories.size === CATEGORIES.length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600">Map Layers</h3>
        <button
          onClick={() =>
            onToggle(allActive ? new Set() : new Set(CATEGORIES))
          }
          className="text-xs text-brand-600 hover:underline"
        >
          {allActive ? "Hide all" : "Show all"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={active ? { backgroundColor: CATEGORY_COLORS[cat] } : {}}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
