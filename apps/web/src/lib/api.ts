const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getScore(
  lat: number,
  lng: number,
  preset?: string
): Promise<import("@/types").ScoreResponse> {
  const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString() });
  if (preset && preset !== "default") params.set("preset", preset);
  return fetchApi(`/api/v1/score?${params}`);
}

export async function getScoreByAddress(
  query: string,
  preset?: string
): Promise<import("@/types").ScoreResponse> {
  const params = new URLSearchParams({ q: query });
  if (preset && preset !== "default") params.set("preset", preset);
  return fetchApi(`/api/v1/score/address?${params}`);
}

export async function searchAddress(
  query: string
): Promise<{ results: import("@/types").SearchResult[] }> {
  return fetchApi(`/api/v1/search?q=${encodeURIComponent(query)}`);
}

export async function getHeatmap(
  resolution: number = 9
): Promise<import("@/types").HexScore[]> {
  return fetchApi(`/api/v1/heatmap/${resolution}`);
}

export async function getAmenities(
  bbox: { south: number; west: number; north: number; east: number },
  category?: string
): Promise<{ amenities: import("@/types").AmenityData[]; total: number }> {
  const params = new URLSearchParams({
    bbox_south: bbox.south.toString(),
    bbox_west: bbox.west.toString(),
    bbox_north: bbox.north.toString(),
    bbox_east: bbox.east.toString(),
  });
  if (category) params.set("category", category);
  return fetchApi(`/api/v1/amenities?${params}`);
}

export async function compareLocations(
  locations: Array<{ lat: number; lng: number; preset?: string }>
): Promise<{ scores: import("@/types").ScoreResponse[] }> {
  return fetchApi("/api/v1/compare", {
    method: "POST",
    body: JSON.stringify({ locations }),
  });
}
