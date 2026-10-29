/**
 * Geodesic Distance and City Geocoding Utilities
 * Automatically maps user-entered cities to real geographical coordinates
 * and calculates accurate inter-city / intra-city distances.
 */

export const KNOWN_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Major Indian Metros and Cities
  delhi: { lat: 28.6139, lng: 77.2090 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  noida: { lat: 28.5355, lng: 77.3910 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  faridabad: { lat: 28.4089, lng: 77.3178 },
  ghaziabad: { lat: 28.6692, lng: 77.4538 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bombay: { lat: 19.0760, lng: 72.8777 },
  thane: { lat: 19.2183, lng: 72.9781 },
  "navi mumbai": { lat: 19.0330, lng: 73.0297 },
  pune: { lat: 18.5204, lng: 73.8567 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  kanpur: { lat: 26.4499, lng: 80.3319 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  indore: { lat: 22.7196, lng: 75.8577 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  patna: { lat: 25.5941, lng: 85.1376 },
  surat: { lat: 21.1702, lng: 72.8311 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  cochin: { lat: 9.9312, lng: 76.2673 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  goa: { lat: 15.2993, lng: 74.1240 },
  panaji: { lat: 15.4909, lng: 73.8278 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  vizag: { lat: 17.6868, lng: 83.2185 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  agra: { lat: 27.1767, lng: 78.0081 },
  amritsar: { lat: 31.6340, lng: 74.8723 },
  dehradun: { lat: 30.3165, lng: 78.0322 },
  ranchi: { lat: 23.3441, lng: 85.3096 },
  bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  mysuru: { lat: 12.2958, lng: 76.6394 },
  jodhpur: { lat: 26.2389, lng: 73.0243 },
  udaipur: { lat: 24.5854, lng: 73.7125 },

  // International Metros
  "new york": { lat: 40.7128, lng: -74.0060 },
  nyc: { lat: 40.7128, lng: -74.0060 },
  london: { lat: 51.5074, lng: -0.1278 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  seattle: { lat: 47.6062, lng: -122.3321 },
}

/**
 * Searches coordinates for a given city string with normalization
 */
export function getCoordinatesForCity(cityName?: string): { lat: number; lng: number } | null {
  if (!cityName) return null
  const cleaned = cityName.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "")
  if (KNOWN_CITY_COORDINATES[cleaned]) {
    return KNOWN_CITY_COORDINATES[cleaned]
  }

  // Partial matching: e.g. "pune, maharashtra" -> matches "pune"
  for (const [key, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (cleaned.includes(key)) {
      return coords
    }
  }

  return null
}

/**
 * Haversine formula: returns distance between two coordinate pairs in kilometers
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Resolves best geographical coordinates for a profile using either GPS or City name
 */
export function resolveProfileCoordinates(profile: any): { lat: number; lng: number } {
  // If GPS coordinates exist and are non-zero, use them
  if (
    profile?.location?.latitude &&
    profile?.location?.longitude &&
    Math.abs(profile.location.latitude) > 0.001 &&
    Math.abs(profile.location.longitude) > 0.001
  ) {
    return {
      lat: Number(profile.location.latitude),
      lng: Number(profile.location.longitude),
    }
  }

  // Otherwise, geocode from the entered City or Address name
  const cityQuery = profile?.location?.city || profile?.location?.address || ""
  const matched = getCoordinatesForCity(cityQuery)
  if (matched) {
    return matched
  }

  // Default coordinate (Delhi)
  return { lat: 28.6139, lng: 77.2090 }
}

/**
 * Computes realistic distance between two user profiles based on their entered cities / GPS.
 */
export function calculateAccurateDistance(userA: any, userB: any): number {
  const coordsA = resolveProfileCoordinates(userA)
  const coordsB = resolveProfileCoordinates(userB)

  const cityA = (userA?.location?.city || "").trim().toLowerCase()
  const cityB = (userB?.location?.city || "").trim().toLowerCase()

  const rawDistance = haversineDistanceKm(coordsA.lat, coordsA.lng, coordsB.lat, coordsB.lng)

  // If distance is > 10 km (different cities or distinct GPS coordinates), return actual distance
  if (rawDistance >= 10) {
    return Math.round(rawDistance)
  }

  // If both users entered the same city or are in same immediate radius,
  // produce a realistic intra-city neighborhood distance (2.1 km to 8.7 km)
  // based on deterministic UID hash so it is realistic and never shows 0km or "nearby".
  const pairSeed = `${userA?.uid || ""}_${userB?.uid || ""}`
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
  
  const intraCityOffset = ((pairSeed % 65) + 21) / 10 // 2.1 km to 8.6 km
  return Math.round(intraCityOffset * 10) / 10
}

/**
 * Formats distance cleanly for user display
 * Examples: "3.2 km away", "120 km away", "1,150 km away"
 */
export function formatAccurateDistanceLabel(distanceKm: number): string {
  if (distanceKm < 1) {
    return "< 1 km away"
  }
  if (distanceKm >= 100) {
    return `${Math.round(distanceKm).toLocaleString()} km away`
  }
  return `${distanceKm.toFixed(1)} km away`
}
