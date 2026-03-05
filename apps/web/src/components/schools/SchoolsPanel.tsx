"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SchoolRankingItem } from "./SchoolRankingItem";
import type { NearbySchool } from "@/types";

interface SchoolsPanelProps {
  schools: NearbySchool[];
  loading: boolean;
  hasCustomRanks: boolean;
  onRanksChange: (ranks: Record<number, number> | null) => void;
  onResetRanks: () => void;
}

export function SchoolsPanel({
  schools,
  loading,
  hasCustomRanks,
  onRanksChange,
  onResetRanks,
}: SchoolsPanelProps) {
  const [orderedSchools, setOrderedSchools] = useState<NearbySchool[]>(schools);

  // Sync ordered schools when schools prop changes (new location)
  const [prevSchools, setPrevSchools] = useState(schools);
  if (schools !== prevSchools) {
    setPrevSchools(schools);
    setOrderedSchools(schools);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrderedSchools((items) => {
        const oldIndex = items.findIndex((s) => s.amenity_id === active.id);
        const newIndex = items.findIndex((s) => s.amenity_id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Build rank map from new order: { amenity_id: 1-based-rank }
        const ranks: Record<number, number> = {};
        newOrder.forEach((school, idx) => {
          ranks[school.amenity_id] = idx + 1;
        });
        onRanksChange(ranks);

        return newOrder;
      });
    },
    [onRanksChange]
  );

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          Loading schools...
        </div>
      </div>
    );
  }

  if (orderedSchools.length === 0) {
    return (
      <div className="flex flex-col items-center p-6 text-center">
        <div className="mb-3 rounded-full bg-gray-100 p-3">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">No schools found nearby</p>
        <p className="mt-1 text-xs text-gray-400">Click the map to select a location</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Schools Near You
          <span className="ml-1.5 text-xs font-normal text-gray-500">
            ({orderedSchools.length})
          </span>
        </h3>
        {hasCustomRanks && (
          <button
            onClick={onResetRanks}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Reset to default
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-gray-400">
        Drag to reorder — top-ranked schools boost your livability score
      </p>

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedSchools.map((s) => s.amenity_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5">
            {orderedSchools.map((school, index) => (
              <SchoolRankingItem
                key={school.amenity_id}
                school={school}
                rank={index + 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
