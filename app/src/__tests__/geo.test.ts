import {
  haversineMeters,
  bearingDeg,
  pointToSegmentMeters,
  decodePolyline,
  formatDistance,
  formatDuration,
} from '@/utils/geo';

describe('geo utils', () => {
  test('haversine: Paris ↔ Lyon ≈ 392 km', () => {
    const paris = { latitude: 48.8566, longitude: 2.3522 };
    const lyon = { latitude: 45.764, longitude: 4.8357 };
    const d = haversineMeters(paris, lyon);
    expect(d).toBeGreaterThan(385_000);
    expect(d).toBeLessThan(400_000);
  });

  test('haversine: même point = 0', () => {
    const p = { latitude: 48.85, longitude: 2.35 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  test('bearing plein est ≈ 90°', () => {
    const a = { latitude: 0, longitude: 0 };
    const b = { latitude: 0, longitude: 1 };
    expect(Math.abs(bearingDeg(a, b) - 90)).toBeLessThan(1);
  });

  test('point sur le segment → distance ≈ 0', () => {
    const a = { latitude: 48.85, longitude: 2.35 };
    const b = { latitude: 48.86, longitude: 2.36 };
    const mid = { latitude: 48.855, longitude: 2.355 };
    expect(pointToSegmentMeters(mid, a, b)).toBeLessThan(5);
  });

  test('point éloigné du segment → grande distance', () => {
    const a = { latitude: 48.85, longitude: 2.35 };
    const b = { latitude: 48.86, longitude: 2.35 };
    const off = { latitude: 48.855, longitude: 2.4 };
    expect(pointToSegmentMeters(off, a, b)).toBeGreaterThan(2000);
  });

  test('decodePolyline retrouve un tracé connu', () => {
    // Exemple canonique de la doc Google.
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toHaveLength(3);
    expect(pts[0].latitude).toBeCloseTo(38.5, 1);
    expect(pts[0].longitude).toBeCloseTo(-120.2, 1);
  });

  test('formatage distance/durée', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDuration(90)).toBe('2 min');
    expect(formatDuration(3720)).toBe('1 h 02');
  });
});
