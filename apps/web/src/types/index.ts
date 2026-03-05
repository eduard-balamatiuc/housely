export interface CategoryScore {
  category: string;
  score: number;
  amenity_count: number;
  nearest_distance: number | null;
  weight: number;
}

export interface ScoreResponse {
  overall: number;
  grade: string;
  lat: number;
  lng: number;
  category_scores: CategoryScore[];
}

export interface LocationSelection {
  lat: number;
  lng: number;
  name?: string;
}

export interface SearchResult {
  display_name: string;
  lat: number;
  lng: number;
  osm_type?: string;
  osm_id?: number;
}

export interface HexScore {
  h3_index: string;
  overall_score: number;
  category_scores: Record<string, number>;
  lat: number;
  lng: number;
}

export interface AmenityData {
  id: number;
  osm_id?: number;
  name?: string;
  category: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distance?: number;
}

export interface NearbySchool {
  amenity_id: number;
  name: string | null;
  distance_m: number;
  educat_rank: number | null;
  sector: string | null;
  lat: number;
  lng: number;
}

export type ScoringPreset = "default" | "family" | "young_professional" | "retiree";

export const CATEGORY_LABELS: Record<string, string> = {
  schools: "Schools",
  kindergartens: "Kindergartens",
  pharmacies: "Pharmacies",
  gyms: "Gyms & Sports",
  supermarkets: "Supermarkets",
  public_transport: "Public Transport",
  parks: "Parks",
  medical: "Medical",
  restaurants_cafes: "Restaurants & Cafes",
  banks_atms: "Banks & ATMs",
  parking: "Parking",
  cultural: "Cultural",
};

export const CATEGORY_COLORS: Record<string, string> = {
  schools: "#4F46E5",
  kindergartens: "#7C3AED",
  pharmacies: "#DC2626",
  gyms: "#EA580C",
  supermarkets: "#16A34A",
  public_transport: "#2563EB",
  parks: "#15803D",
  medical: "#E11D48",
  restaurants_cafes: "#D97706",
  banks_atms: "#0891B2",
  parking: "#6B7280",
  cultural: "#9333EA",
};

export const GRADE_COLORS: Record<string, string> = {
  "A+": "#15803D",
  A: "#16A34A",
  "B+": "#65A30D",
  B: "#CA8A04",
  "C+": "#EA580C",
  C: "#DC2626",
  D: "#991B1B",
  F: "#6B7280",
};
