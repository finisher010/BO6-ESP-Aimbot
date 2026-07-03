import { Coordinate, NavStep, RouteLeg } from '@/types';
import { decodePolyline } from '@/utils/geo';
import { config } from './config';

function coordsParam(coords: Coordinate[]): string {
  return coords.map((c) => `${c.longitude},${c.latitude}`).join(';');
}

export interface MatrixResult {
  /** durations[i][j] en secondes, distances[i][j] en mètres. */
  durations: number[][];
  distances: number[][];
}

/**
 * Matrice origine/destination via OSRM /table. Sert à l'optimiseur.
 * Fallback (haversine) géré en amont par l'optimiseur si l'appel échoue.
 */
export async function fetchMatrix(coords: Coordinate[]): Promise<MatrixResult> {
  const url =
    `${config.osrmUrl}/table/v1/driving/${coordsParam(coords)}` +
    `?annotations=duration,distance`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Matrice OSRM échouée (${res.status})`);
  const data = (await res.json()) as {
    code: string;
    durations: number[][];
    distances: number[][];
  };
  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.code}`);
  return { durations: data.durations, distances: data.distances };
}

export interface DirectionsResult {
  legs: RouteLeg[];
  steps: NavStep[];
  geometry: Coordinate[];
  totalDistanceM: number;
  totalDurationS: number;
}

/**
 * Itinéraire détaillé (géométrie + manœuvres pas-à-pas) pour une suite ordonnée
 * d'arrêts. Utilisé pour l'affichage carte et le guidage vocal.
 */
export async function fetchDirections(
  ordered: { id: string; coordinate: Coordinate }[]
): Promise<DirectionsResult> {
  const coords = ordered.map((o) => o.coordinate);
  const url =
    `${config.osrmUrl}/route/v1/driving/${coordsParam(coords)}` +
    `?overview=full&geometries=polyline&steps=true&annotations=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Itinéraire OSRM échoué (${res.status})`);
  const data = (await res.json()) as any;
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM: ${data.code ?? 'sans route'}`);
  }
  const route = data.routes[0];
  const legs: RouteLeg[] = (route.legs as any[]).map((leg, i) => ({
    fromId: ordered[i].id,
    toId: ordered[i + 1].id,
    distanceM: leg.distance,
    durationS: leg.duration,
    geometry: leg.steps.flatMap((s: any) => decodePolyline(s.geometry)),
  }));

  const steps: NavStep[] = [];
  for (const leg of route.legs as any[]) {
    for (const s of leg.steps as any[]) {
      const loc = s.maneuver.location as [number, number];
      steps.push({
        instruction: humanizeManeuver(s),
        coordinate: { latitude: loc[1], longitude: loc[0] },
        distanceM: s.distance,
        maneuver: s.maneuver.type,
        modifier: s.maneuver.modifier,
      });
    }
  }

  return {
    legs,
    steps,
    geometry: decodePolyline(route.geometry),
    totalDistanceM: route.distance,
    totalDurationS: route.duration,
  };
}

const MODIFIER_FR: Record<string, string> = {
  left: 'à gauche',
  right: 'à droite',
  'slight left': 'légèrement à gauche',
  'slight right': 'légèrement à droite',
  'sharp left': 'franchement à gauche',
  'sharp right': 'franchement à droite',
  straight: 'tout droit',
  uturn: 'demi-tour',
};

/** Convertit une manœuvre OSRM en consigne française parlée. */
export function humanizeManeuver(step: any): string {
  const name = step.name ? ` sur ${step.name}` : '';
  const type = step.maneuver.type as string;
  const mod = step.maneuver.modifier as string | undefined;
  const dir = mod ? MODIFIER_FR[mod] ?? mod : '';
  switch (type) {
    case 'depart':
      return `Départ${name}`;
    case 'turn':
      return `Tournez ${dir}${name}`;
    case 'new name':
      return `Continuez${name}`;
    case 'merge':
      return `Insérez-vous ${dir}${name}`;
    case 'on ramp':
      return `Prenez la bretelle ${dir}`;
    case 'off ramp':
      return `Prenez la sortie ${dir}`;
    case 'fork':
      return `Au embranchement, gardez ${dir}`;
    case 'roundabout':
    case 'rotary':
      return `Au rond-point, prenez la ${step.maneuver.exit ?? ''}e sortie`;
    case 'end of road':
      return `En bout de voie, tournez ${dir}`;
    case 'continue':
      return `Continuez ${dir}${name}`;
    case 'arrive':
      return `Vous êtes arrivé à destination`;
    default:
      return `Continuez ${dir}${name}`.trim();
  }
}
