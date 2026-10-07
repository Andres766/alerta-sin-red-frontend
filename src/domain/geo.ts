const EARTH_RADIUS_KM = 6371.0088

export interface LatLon {
  latitude: number
  longitude: number
}

/** Haversine: permite calcular zonas cercanas en el dispositivo, sin conexión. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
