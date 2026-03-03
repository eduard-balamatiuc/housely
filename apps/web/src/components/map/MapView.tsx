"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LocationSelection, HexScore } from "@/types";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types";
import { getHeatmap, getAmenities } from "@/lib/api";

interface MapViewProps {
  selectedLocation: LocationSelection | null;
  onMapClick: (lat: number, lng: number) => void;
  activeCategories: Set<string>;
  showHeatmap: boolean;
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

            // Popup on click (marker layer only)
            m.on("click", markerLayerId, (e) => {
              if (!e.features?.[0]) return;
              const props = e.features[0].properties;
              const coords = (e.features[0].geometry as GeoJSON.Point).coordinates;
              new maplibregl.Popup({ offset: 10 })
                .setLngLat(coords as [number, number])
                .setHTML(
                  `<strong>${props?.name || "Unnamed"}</strong><br/><span style="color:#666">${props?.category}</span>`
                )
                .addTo(m);
            });

            m.on("mouseenter", markerLayerId, () => {
              m.getCanvas().style.cursor = "pointer";
            });
            m.on("mouseleave", markerLayerId, () => {
              m.getCanvas().style.cursor = "";
            });
          }
        })
        .catch((err) => console.error(`Amenity load error (${category}):`, err));
    });
  }, [activeCategories, mapLoaded]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
