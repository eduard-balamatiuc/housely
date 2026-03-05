"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LocationSelection, HexScore, NearbySchool } from "@/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types";
import { getHeatmap, getAmenities } from "@/lib/api";

interface MapViewProps {
  selectedLocation: LocationSelection | null;
  onMapClick: (lat: number, lng: number) => void;
  activeCategories: Set<string>;
  showHeatmap: boolean;
  nearbySchools?: NearbySchool[];
  schoolRanks?: Record<number, number>;
}

// Chisinau center
const CHISINAU_CENTER: [number, number] = [28.8353, 47.0245];
const DEFAULT_ZOOM = 13;

function scoreToColor(score: number): string {
  if (score >= 80) return "rgba(22, 163, 74, 0.5)";
  if (score >= 60) return "rgba(101, 163, 13, 0.5)";
  if (score >= 40) return "rgba(202, 138, 4, 0.5)";
  if (score >= 20) return "rgba(234, 88, 12, 0.5)";
  return "rgba(220, 38, 38, 0.5)";
}

export default function MapView({
  selectedLocation,
  onMapClick,
  activeCategories,
  showHeatmap,
  nearbySchools,
  schoolRanks,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const tooltip = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style:
        process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ||
        "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: CHISINAU_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 10,
      maxZoom: 18,
    });

    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      "top-right"
    );

    m.on("load", () => {
      setMapLoaded(true);
    });

    m.on("click", (e) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    map.current = m;

    return () => {
      if (tooltip.current) {
        tooltip.current.remove();
        tooltip.current = null;
      }
      m.remove();
      map.current = null;
    };
  }, [onMapClick]);

  // Fly to selected location + update marker
  useEffect(() => {
    if (!map.current || !selectedLocation) return;

    map.current.flyTo({
      center: [selectedLocation.lng, selectedLocation.lat],
      zoom: 15,
      duration: 1500,
    });

    if (marker.current) marker.current.remove();
    marker.current = new maplibregl.Marker({ color: "#2f9468" })
      .setLngLat([selectedLocation.lng, selectedLocation.lat])
      .addTo(map.current);
  }, [selectedLocation]);

  // Load heatmap data
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    if (!showHeatmap) {
      if (m.getLayer("heatmap-layer")) m.removeLayer("heatmap-layer");
      if (m.getSource("heatmap")) m.removeSource("heatmap");
      return;
    }

    getHeatmap(9)
      .then((hexes) => {
        const geojson: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: hexes.map((hex) => ({
            type: "Feature",
            properties: {
              score: hex.overall_score,
              color: scoreToColor(hex.overall_score),
            },
            geometry: {
              type: "Point",
              coordinates: [hex.lng, hex.lat],
            },
          })),
        };

        if (m.getSource("heatmap")) {
          (m.getSource("heatmap") as maplibregl.GeoJSONSource).setData(geojson);
        } else {
          m.addSource("heatmap", { type: "geojson", data: geojson });
          m.addLayer({
            id: "heatmap-layer",
            type: "circle",
            source: "heatmap",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 4,
                13, 10,
                16, 20,
              ],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.7,
              "circle-stroke-width": 0,
            },
          });
        }
      })
      .catch((err) => console.error("Heatmap load error:", err));
  }, [showHeatmap, mapLoaded]);

  // Load amenity markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    // Clean up tooltip when categories change
    if (tooltip.current) {
      tooltip.current.remove();
      tooltip.current = null;
    }

    // Remove existing amenity layers
    const existingLayers = m.getStyle().layers || [];
    existingLayers.forEach((layer) => {
      if (layer.id.startsWith("amenity-")) {
        m.removeLayer(layer.id);
      }
    });
    const existingSources = Object.keys(m.getStyle().sources || {});
    existingSources.forEach((src) => {
      if (src.startsWith("amenity-")) {
        m.removeSource(src);
      }
    });

    if (activeCategories.size === 0) return;

    const bounds = m.getBounds();
    const bbox = {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    };

    Array.from(activeCategories).forEach((category) => {
      getAmenities(bbox, category)
        .then(({ amenities }) => {
          if (!map.current) return;
          const sourceId = `amenity-${category}`;
          const glowLayerId = `amenity-glow-${category}`;
          const markerLayerId = `amenity-${category}`;
          const categoryColor = CATEGORY_COLORS[category] || "#6B7280";

          const geojson: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: amenities.map((a) => ({
              type: "Feature",
              properties: { name: a.name || "", category: a.category, subcategory: a.subcategory || "" },
              geometry: { type: "Point", coordinates: [a.lng, a.lat] },
            })),
          };

          if (m.getSource(sourceId)) {
            (m.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
          } else {
            m.addSource(sourceId, { type: "geojson", data: geojson });

            // Glow layer: large blurred circle for radial gradient effect
            m.addLayer({
              id: glowLayerId,
              type: "circle",
              source: sourceId,
              paint: {
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10, 10,
                  13, 30,
                  16, 50,
                  18, 70,
                ],
                "circle-color": categoryColor,
                "circle-blur": 1,
                "circle-opacity": 0.45,
                "circle-stroke-width": 0,
              },
            });

            // Marker layer: small solid circle on top of the glow
            m.addLayer({
              id: markerLayerId,
              type: "circle",
              source: sourceId,
              paint: {
                "circle-radius": 6,
                "circle-color": categoryColor,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#ffffff",
              },
            });

            // Hover tooltip (marker layer only)
            m.on("mouseenter", markerLayerId, (e) => {
              m.getCanvas().style.cursor = "pointer";
              if (!e.features?.[0]) return;
              const props = e.features[0].properties;
              const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

              const name = props?.name || "Unnamed";
              const categoryLabel = CATEGORY_LABELS[props?.category] || props?.category || "";
              const subcategory = props?.subcategory || "";

              let html = `<div class="tooltip-name">${name}</div>`;
              html += `<div class="tooltip-category">${categoryLabel}</div>`;
              if (subcategory) {
                html += `<div class="tooltip-subcategory">${subcategory}</div>`;
              }

              if (tooltip.current) {
                tooltip.current.setLngLat(coords).setHTML(html);
              } else {
                tooltip.current = new maplibregl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                  offset: 12,
                  className: "amenity-tooltip",
                })
                  .setLngLat(coords)
                  .setHTML(html)
                  .addTo(m);
              }
            });

            m.on("mouseleave", markerLayerId, () => {
              m.getCanvas().style.cursor = "";
              if (tooltip.current) {
                tooltip.current.remove();
                tooltip.current = null;
              }
            });
          }
        })
        .catch((err) => console.error(`Amenity load error (${category}):`, err));
    });
  }, [activeCategories, mapLoaded]);

  // School rank badges layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    // Clean up existing school rank layers
    if (m.getLayer("school-rank-labels")) m.removeLayer("school-rank-labels");
    if (m.getLayer("school-rank-circles")) m.removeLayer("school-rank-circles");
    if (m.getSource("school-ranks")) m.removeSource("school-ranks");

    if (!nearbySchools || nearbySchools.length === 0 || !activeCategories.has("schools")) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: nearbySchools
        .filter((s) => s.educat_rank !== null || (schoolRanks && schoolRanks[s.amenity_id]))
        .map((s) => {
          const rank = schoolRanks?.[s.amenity_id] ?? s.educat_rank ?? 0;
          return {
            type: "Feature" as const,
            properties: {
              rank,
              name: s.name || "Unnamed",
              sector: s.sector || "",
              distance: Math.round(s.distance_m),
            },
            geometry: {
              type: "Point" as const,
              coordinates: [s.lng, s.lat],
            },
          };
        }),
    };

    m.addSource("school-ranks", { type: "geojson", data: geojson });

    // Circle background for rank badge
    m.addLayer({
      id: "school-rank-circles",
      type: "circle",
      source: "school-ranks",
      paint: {
        "circle-radius": 11,
        "circle-color": [
          "case",
          ["<=", ["get", "rank"], 5], "#FFFBEB",
          ["<=", ["get", "rank"], 10], "#F8FAFC",
          "#F3F4F6",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": [
          "case",
          ["<=", ["get", "rank"], 5], "#F59E0B",
          ["<=", ["get", "rank"], 10], "#94A3B8",
          "#D1D5DB",
        ],
      },
    });

    // Rank number label
    m.addLayer({
      id: "school-rank-labels",
      type: "symbol",
      source: "school-ranks",
      layout: {
        "text-field": ["to-string", ["get", "rank"]],
        "text-size": 11,
        "text-font": ["Open Sans Bold"],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": [
          "case",
          ["<=", ["get", "rank"], 5], "#92400E",
          ["<=", ["get", "rank"], 10], "#475569",
          "#6B7280",
        ],
      },
    });

    // Tooltip for rank badges
    m.on("mouseenter", "school-rank-circles", (e) => {
      m.getCanvas().style.cursor = "pointer";
      if (!e.features?.[0]) return;
      const props = e.features[0].properties;
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      let html = `<div class="tooltip-name">${props?.name}</div>`;
      html += `<div class="tooltip-category">Rank #${props?.rank}</div>`;
      if (props?.sector) html += `<div class="tooltip-subcategory">${props?.sector}</div>`;
      html += `<div class="tooltip-subcategory">${props?.distance}m away</div>`;

      if (tooltip.current) {
        tooltip.current.setLngLat(coords).setHTML(html);
      } else {
        tooltip.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: "amenity-tooltip",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(m);
      }
    });

    m.on("mouseleave", "school-rank-circles", () => {
      m.getCanvas().style.cursor = "";
      if (tooltip.current) {
        tooltip.current.remove();
        tooltip.current = null;
      }
    });
  }, [nearbySchools, schoolRanks, activeCategories, mapLoaded]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
