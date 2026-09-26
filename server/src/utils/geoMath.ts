// ============================================================
// Geo-math utilities
// ============================================================

/** Haversine distance between two lat/lng points in metres */
export function haversineDistanceMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Interpolate a point at a given fraction (0–1) along a polyline.
 * Returns {lat, lng} of the interpolated position.
 */
export function interpolatePolyline(
  coordinates: Array<[number, number]>, // [lat, lng]
  fraction: number,
): { lat: number; lng: number } {
  if (coordinates.length === 0) throw new Error('Empty polyline');
  if (fraction <= 0) return { lat: coordinates[0][0], lng: coordinates[0][1] };
  if (fraction >= 1) {
    const last = coordinates[coordinates.length - 1];
    return { lat: last[0], lng: last[1] };
  }

  // Build cumulative distances
  const segments: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const d = haversineDistanceMetres(
      coordinates[i - 1][0],
      coordinates[i - 1][1],
      coordinates[i][0],
      coordinates[i][1],
    );
    segments.push(segments[i - 1] + d);
  }
  const totalLength = segments[segments.length - 1];
  const targetDist = totalLength * fraction;

  for (let i = 1; i < coordinates.length; i++) {
    if (segments[i] >= targetDist) {
      const segStart = segments[i - 1];
      const segEnd = segments[i];
      const segFraction = (targetDist - segStart) / (segEnd - segStart);
      const lat =
        coordinates[i - 1][0] +
        segFraction * (coordinates[i][0] - coordinates[i - 1][0]);
      const lng =
        coordinates[i - 1][1] +
        segFraction * (coordinates[i][1] - coordinates[i - 1][1]);
      return { lat, lng };
    }
  }

  const last = coordinates[coordinates.length - 1];
  return { lat: last[0], lng: last[1] };
}

/** Bounding box around a set of coordinates */
export function boundingBox(coords: Array<[number, number]>): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const lats = coords.map((c) => c[0]);
  const lngs = coords.map((c) => c[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * Decodes a Google-encoded polyline string into an array of [lat, lng] coordinates.
 */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const poly: Array<[number, number]> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
}

/**
 * Distance in metres from a point (lat, lng) to a line segment defined by (lat1, lng1) - (lat2, lng2).
 */
export function distanceToSegmentMetres(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  // Convert to Cartesian approximation around midpoint for small distances
  const midLat = (aLat + bLat) / 2;
  const kx = Math.cos(toRad(midLat)) * 111320;
  const ky = 110540;

  const px = (pLng - aLng) * kx;
  const py = (pLat - aLat) * ky;
  const bx = (bLng - aLng) * kx;
  const by = (bLat - aLat) * ky;

  const abLenSq = bx * bx + by * by;
  if (abLenSq === 0) {
    return Math.sqrt(px * px + py * py);
  }

  // Projection scalar t on segment [0, 1]
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / abLenSq));
  const projX = t * bx;
  const projY = t * by;

  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the minimum distance in metres from a point to any segment of a polyline.
 */
export function minDistanceToPolyline(
  lat: number,
  lng: number,
  polyline: Array<[number, number]>,
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return haversineDistanceMetres(lat, lng, polyline[0][0], polyline[0][1]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegmentMetres(
      lat,
      lng,
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1],
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

/**
 * Calculates the cumulative distance in metres along a polyline from start
 * to the projected closest point of (lat, lng).
 */
export function distanceAlongPolylineMetres(
  lat: number,
  lng: number,
  polyline: Array<[number, number]>,
): number {
  if (polyline.length <= 1) return 0;

  let minDistance = Infinity;
  let bestSegmentIndex = 0;
  let bestT = 0;
  const segmentLengths: number[] = [];

  for (let i = 0; i < polyline.length - 1; i++) {
    const aLat = polyline[i]![0];
    const aLng = polyline[i]![1];
    const bLat = polyline[i + 1]![0];
    const bLng = polyline[i + 1]![1];

    const segLen = haversineDistanceMetres(aLat, aLng, bLat, bLng);
    segmentLengths.push(segLen);

    const midLat = (aLat + bLat) / 2;
    const kx = Math.cos(toRad(midLat)) * 111320;
    const ky = 110540;

    const px = (lng - aLng) * kx;
    const py = (lat - aLat) * ky;
    const bx = (bLng - aLng) * kx;
    const by = (bLat - aLat) * ky;

    const abLenSq = bx * bx + by * by;
    const t = abLenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / abLenSq));
    const projX = t * bx;
    const projY = t * by;

    const dx = px - projX;
    const dy = py - projY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDistance) {
      minDistance = dist;
      bestSegmentIndex = i;
      bestT = t;
    }
  }

  let cumulativeDistance = 0;
  for (let i = 0; i < bestSegmentIndex; i++) {
    cumulativeDistance += segmentLengths[i]!;
  }
  cumulativeDistance += bestT * (segmentLengths[bestSegmentIndex] ?? 0);

  return Math.round(cumulativeDistance);
}


