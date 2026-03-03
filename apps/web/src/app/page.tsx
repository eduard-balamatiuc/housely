"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/search/SearchBar";
import { ScorePanel } from "@/components/scoring/ScorePanel";
import { WeightSliders } from "@/components/filters/WeightSliders";
import { CategoryToggles } from "@/components/filters/CategoryToggles";
import { CompareView } from "@/components/compare/CompareView";
import type { ScoreResponse, LocationSelection } from "@/types";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState<LocationSelection | null>(null);
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [compareLocations, setCompareLocations] = useState<ScoreResponse[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<string>("default");
  const [customWeights, setCustomWeights] = useState<Record<string, number> | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchScore = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
        });
        if (preset !== "default") params.set("preset", preset);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/score?${params}`);
        if (!res.ok) throw new Error("Failed to fetch score");
        const data: ScoreResponse = await res.json();
        setScoreData(data);

        if (isComparing) {
          setCompareLocations((prev) => [...prev.slice(-3), data]);
        }
      } catch (err) {
        console.error("Score fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [preset, isComparing]
  );

  const handleLocationSelect = useCallback(
    (location: LocationSelection) => {
      setSelectedLocation(location);
      fetchScore(location.lat, location.lng);
    },
    [fetchScore]
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      handleLocationSelect({ lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    },
    [handleLocationSelect]
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="z-20 flex h-16 items-center gap-4 border-b bg-white px-4 shadow-sm">
        <h1 className="text-xl font-bold text-brand-700">Housely</h1>
        <div className="flex-1">
          <SearchBar onSelect={handleLocationSelect} />
        </div>
        <button
          onClick={() => {
            setIsComparing(!isComparing);
            if (!isComparing) setCompareLocations([]);
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            isComparing
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {isComparing ? "Exit Compare" : "Compare"}
        </button>
      </header>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1">
          <MapView
            selectedLocation={selectedLocation}
            onMapClick={handleMapClick}
            activeCategories={activeCategories}
            showHeatmap={showHeatmap}
          />
        </div>

        {/* Side Panel */}
        <aside className="z-10 w-96 overflow-y-auto border-l bg-white shadow-lg">
          {isComparing && compareLocations.length > 0 ? (
            <CompareView locations={compareLocations} />
          ) : scoreData ? (
            <>
              <ScorePanel score={scoreData} loading={loading} />
              <div className="border-t p-4">
                <WeightSliders
                  preset={preset}
                  onPresetChange={setPreset}
                  customWeights={customWeights}
                  onWeightsChange={(w) => {
                    setCustomWeights(w);
                    if (selectedLocation) {
                      fetchScore(selectedLocation.lat, selectedLocation.lng);
                    }
                  }}
                />
              </div>
              <div className="border-t p-4">
                <CategoryToggles
                  activeCategories={activeCategories}
                  onToggle={(categories) => setActiveCategories(categories)}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-full bg-brand-50 p-4">
                <svg className="h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Search for an address
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Type an address or click anywhere on the map to see the livability score
              </p>
            </div>
          )}

          {/* Heatmap Toggle */}
          <div className="border-t p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-700">Show heatmap</span>
            </label>
          </div>
        </aside>
      </div>
    </div>
  );
}
