import { optimizeRoute, twoOpt } from '@/services/optimizer';

// On force le fallback haversine en faisant échouer l'appel réseau OSRM.
beforeAll(() => {
  // @ts-expect-error override test
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
});

describe('twoOpt', () => {
  test('défait un croisement évident (départ fixe)', () => {
    // 4 points en carré ; un ordre croisé doit être amélioré.
    // Indices 0..3 ; matrice = distances euclidiennes d'un carré unité.
    const pts = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ];
    const cost = pts.map((a) => pts.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])));
    // Ordre croisé : 0 → 2 → 1 → 3 (diagonale puis retour).
    const crossed = [0, 2, 1, 3];
    const fixed = twoOpt(crossed, cost, false);
    const length = (r: number[]) => {
      let t = 0;
      for (let i = 0; i + 1 < r.length; i++) t += cost[r[i]][r[i + 1]];
      return t;
    };
    expect(length(fixed)).toBeLessThanOrEqual(length(crossed));
    expect(fixed[0]).toBe(0); // le départ ne bouge jamais
  });
});

describe('optimizeRoute (fallback haversine)', () => {
  test('visite tous les arrêts une seule fois', async () => {
    const start = { latitude: 48.85, longitude: 2.35 };
    const stops = [
      { id: 'a', coordinate: { latitude: 48.86, longitude: 2.36 } },
      { id: 'b', coordinate: { latitude: 48.87, longitude: 2.37 } },
      { id: 'c', coordinate: { latitude: 48.84, longitude: 2.34 } },
    ];
    const res = await optimizeRoute({ start, stops, returnToStart: false });
    expect(res.costSource).toBe('haversine');
    expect(res.orderedStopIds.sort()).toEqual(['a', 'b', 'c']);
    expect(res.estimatedDistanceM).toBeGreaterThan(0);
  });

  test('liste vide → résultat neutre', async () => {
    const res = await optimizeRoute({
      start: { latitude: 0, longitude: 0 },
      stops: [],
      returnToStart: false,
    });
    expect(res.orderedStopIds).toEqual([]);
    expect(res.estimatedDistanceM).toBe(0);
  });

  test('ordonne les arrêts colinéaires du plus proche au plus loin', async () => {
    const start = { latitude: 0, longitude: 0 };
    const stops = [
      { id: 'far', coordinate: { latitude: 0, longitude: 0.3 } },
      { id: 'near', coordinate: { latitude: 0, longitude: 0.1 } },
      { id: 'mid', coordinate: { latitude: 0, longitude: 0.2 } },
    ];
    const res = await optimizeRoute({ start, stops, returnToStart: false });
    expect(res.orderedStopIds).toEqual(['near', 'mid', 'far']);
  });
});
