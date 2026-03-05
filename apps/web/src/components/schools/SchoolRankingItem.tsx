"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NearbySchool } from "@/types";

interface SchoolRankingItemProps {
  school: NearbySchool;
  rank: number;
}

function RankBadge({ rank, educat_rank }: { rank: number; educat_rank: number | null }) {
  let borderColor = "border-gray-300";
  let bgColor = "bg-gray-50";
  let textColor = "text-gray-600";

  if (educat_rank === null) {
    // Unranked
    return (
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-xs text-gray-400">
        -
      </div>
    );
  }

  if (rank <= 5) {
    borderColor = "border-amber-400";
    bgColor = "bg-amber-50";
    textColor = "text-amber-700";
  } else if (rank <= 10) {
    borderColor = "border-slate-400";
    bgColor = "bg-slate-50";
    textColor = "text-slate-600";
  }

  return (
    <div
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${borderColor} ${bgColor} ${textColor}`}
    >
      {rank}
    </div>
  );
}

export function SchoolRankingItem({ school, rank }: SchoolRankingItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: school.amenity_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 ${
        isDragging ? "z-50 border-brand-400 shadow-lg opacity-90" : "border-gray-200"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>

      {/* Rank badge */}
      <RankBadge rank={rank} educat_rank={school.educat_rank} />

      {/* School info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          {school.name || "Unnamed school"}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{Math.round(school.distance_m)}m</span>
          {school.sector && (
            <>
              <span className="text-gray-300">|</span>
              <span>{school.sector}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
