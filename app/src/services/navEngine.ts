import { Bridge, Coordinate, NavStep } from '@/types';
import { haversineMeters } from '@/utils/geo';

export interface NavState {
  /** Index de la prochaine manœuvre à annoncer. */
  stepIndex: number;
  /** Distance jusqu'à la prochaine manœuvre, en mètres. */
  distanceToStepM: number;
  currentInstruction: string;
  nextInstruction: string | null;
  /** Pont bas à proximité immédiate (dans le rayon d'alerte), sinon null. */
  bridgeAhead: { bridge: Bridge; distanceM: number } | null;
}

/** Seuil de validation d'une manœuvre : on la considère passée en deçà. */
const REACHED_THRESHOLD_M = 25;
/** Distance d'annonce vocale anticipée d'une manœuvre. */
export const ANNOUNCE_DISTANCE_M = 150;
/** Rayon d'alerte pont bas. */
export const BRIDGE_ALERT_RADIUS_M = 400;

/**
 * Calcule l'état de navigation courant à partir de la position GPS.
 * Avance l'index d'étape tant que l'on est passé sous le seuil.
 */
export function computeNavState(
  position: Coordinate,
  steps: NavStep[],
  fromStepIndex: number,
  lowBridges: Bridge[]
): NavState {
  let stepIndex = Math.min(fromStepIndex, Math.max(0, steps.length - 1));

  // Avance vers la prochaine manœuvre non encore atteinte.
  while (
    stepIndex < steps.length - 1 &&
    haversineMeters(position, steps[stepIndex].coordinate) < REACHED_THRESHOLD_M
  ) {
    stepIndex += 1;
  }

  const current = steps[stepIndex];
  const distanceToStepM = current
    ? haversineMeters(position, current.coordinate)
    : 0;

  // Pont bas le plus proche dans le rayon d'alerte.
  let bridgeAhead: NavState['bridgeAhead'] = null;
  let nearest = Infinity;
  for (const b of lowBridges) {
    const d = haversineMeters(position, b.coordinate);
    if (d < BRIDGE_ALERT_RADIUS_M && d < nearest) {
      nearest = d;
      bridgeAhead = { bridge: b, distanceM: d };
    }
  }

  return {
    stepIndex,
    distanceToStepM,
    currentInstruction: current?.instruction ?? 'Continuez',
    nextInstruction: steps[stepIndex + 1]?.instruction ?? null,
    bridgeAhead,
  };
}

/** Phrase d'annonce vocale avec la distance arrondie. */
export function announcePhrase(state: NavState): string {
  const d = state.distanceToStepM;
  if (d <= REACHED_THRESHOLD_M + 5) return state.currentInstruction;
  const rounded = d < 200 ? Math.round(d / 10) * 10 : Math.round(d / 50) * 50;
  return `Dans ${rounded} mètres, ${lowerFirst(state.currentInstruction)}`;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
