import { Coordinate } from '@/types';

const R_EARTH_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Distance du grand cercle entre deux points, en mètres (Haversine). */
export function haversineMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cap (bearing) de a vers b, en degrés [0,360). */
export function bearingDeg(a: Coordinate, b: Coordinate): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Distance d'un point P au segment AB, en mètres.
 * Projection plane locale (suffisante aux échelles d'une rue).
 */
export function pointToSegmentMeters(
  p: Coordinate,
  a: Coordinate,
  b: Coordinate
): number {
  const latRef = toRad(p.latitude);
  const mPerDegLat = 111132;
  const mPerDegLon = 111320 * Math.cos(latRef);
  const ax = a.longitude * mPerDegLon;
  const ay = a.latitude * mPerDegLat;
  const bx = b.longitude * mPerDegLon;
  const by = b.latitude * mPerDegLat;
  const px = p.longitude * mPerDegLon;
  const py = p.latitude * mPerDegLat;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const denom = abx * abx + aby * aby;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / denom));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

/** Décode une polyline encodée (algorithme Google/OSRM, précision 5). */
export function decodePolyline(encoded: string, precision = 5): Coordinate[] {
  const factor = Math.pow(10, precision);
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const readDelta = (): number => {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += readDelta();
    lng += readDelta();
    coordinates.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return coordinates;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}
