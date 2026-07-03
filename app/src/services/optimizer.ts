import { Coordinate } from '@/types';
import { haversineMeters } from '@/utils/geo';
import { fetchMatrix } from './routing';

export interface OptimizeInput {
  /** Point de départ (position courante ou dépôt). */
  start: Coordinate;
  /** Arrêts à visiter (déjà géocodés). */
  stops: { id: string; coordinate: Coordinate }[];
  /** true = la tournée revient au point de départ. */
  returnToStart: boolean;
}

export interface OptimizeOutput {
  /** Ids des arrêts dans l'ordre optimisé. */
  orderedStopIds: string[];
  estimatedDistanceM: number;
  estimatedDurationS: number;
  /** Source de la matrice de coûts utilisée. */
  costSource: 'osrm' | 'haversine';
}

/** Construit une matrice de coûts haversine (fallback hors-ligne). */
function haversineMatrix(points: Coordinate[]): number[][] {
  return points.map((a) => points.map((b) => haversineMeters(a, b)));
}

/**
 * Optimise l'ordre des arrêts (problème du voyageur de commerce).
 * 1) Matrice de coûts réelle via OSRM (ou haversine en secours).
 * 2) Heuristique du plus proche voisin pour une solution initiale.
 * 3) Amélioration locale 2-opt.
 *
 * Le point d'index 0 est toujours le départ et reste fixe.
 */
export async function optimizeRoute(
  input: OptimizeInput
): Promise<OptimizeOutput> {
  const { start, stops, returnToStart } = input;
  if (stops.length === 0) {
    return {
      orderedStopIds: [],
      estimatedDistanceM: 0,
      estimatedDurationS: 0,
      costSource: 'haversine',
    };
  }

  const points: Coordinate[] = [start, ...stops.map((s) => s.coordinate)];
  const n = points.length;

  let cost: number[][];
  let durations: number[][] | null = null;
  let costSource: 'osrm' | 'haversine' = 'osrm';
  try {
    const matrix = await fetchMatrix(points);
    cost = matrix.distances;
    durations = matrix.durations;
    // OSRM peut renvoyer null pour des points non routables → bascule en secours.
    if (!cost || cost.some((row) => row.some((v) => v == null))) {
      throw new Error('Matrice incomplète');
    }
  } catch {
    cost = haversineMatrix(points);
    costSource = 'haversine';
  }

  // --- Plus proche voisin depuis le départ (index 0) ---
  const visited = new Array<boolean>(n).fill(false);
  visited[0] = true;
  const order = [0];
  for (let step = 1; step < n; step++) {
    const last = order[order.length - 1];
    let best = -1;
    let bestCost = Infinity;
    for (let j = 1; j < n; j++) {
      if (!visited[j] && cost[last][j] < bestCost) {
        bestCost = cost[last][j];
        best = j;
      }
    }
    visited[best] = true;
    order.push(best);
  }

  // --- 2-opt ---
  const improved = twoOpt(order, cost, returnToStart);

  // --- Coûts estimés ---
  let distance = 0;
  let duration = 0;
  for (let i = 0; i + 1 < improved.length; i++) {
    distance += cost[improved[i]][improved[i + 1]];
    if (durations) duration += durations[improved[i]][improved[i + 1]];
  }
  if (returnToStart && improved.length > 1) {
    const a = improved[improved.length - 1];
    distance += cost[a][0];
    if (durations) duration += durations[a][0];
  }
  // Estimation grossière de la durée si pas de données OSRM (~40 km/h moyen urbain).
  if (!durations) duration = distance / (40_000 / 3600);

  // improved[0] === départ ; on retire le départ pour ne renvoyer que les arrêts.
  const orderedStopIds = improved.slice(1).map((idx) => stops[idx - 1].id);

  return {
    orderedStopIds,
    estimatedDistanceM: distance,
    estimatedDurationS: duration,
    costSource,
  };
}

/**
 * 2-opt : tant qu'on trouve une inversion de sous-segment qui raccourcit
 * le trajet, on l'applique. L'index 0 (départ) reste fixe.
 */
export function twoOpt(
  order: number[],
  cost: number[][],
  returnToStart: boolean
): number[] {
  const route = [...order];
  const n = route.length;
  const dist = (a: number, b: number) => cost[a][b];

  const tourLength = (r: number[]) => {
    let total = 0;
    for (let i = 0; i + 1 < r.length; i++) total += dist(r[i], r[i + 1]);
    if (returnToStart && r.length > 1) total += dist(r[r.length - 1], r[0]);
    return total;
  };

  let bestLength = tourLength(route);
  let improvedFlag = true;
  let guard = 0;
  const maxIterations = 60; // borne de sécurité pour rester réactif sur mobile

  while (improvedFlag && guard++ < maxIterations) {
    improvedFlag = false;
    // i commence à 1 : on ne déplace jamais le départ.
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = route
          .slice(0, i)
          .concat(route.slice(i, k + 1).reverse(), route.slice(k + 1));
        const len = tourLength(candidate);
        if (len + 1e-6 < bestLength) {
          route.splice(0, route.length, ...candidate);
          bestLength = len;
          improvedFlag = true;
        }
      }
    }
  }
  return route;
}
