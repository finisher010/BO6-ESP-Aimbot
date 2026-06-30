import { Bridge, BridgeWarning, RouteLeg, VehicleProfile } from '@/types';
import { pointToSegmentMeters } from '@/utils/geo';
import { KNOWN_BRIDGES } from '@/data/bridges';

/** Distance max (m) entre un pont et le tracé pour le considérer « sur la route ». */
const ON_ROUTE_THRESHOLD_M = 25;

let extraBridges: Bridge[] = [];

export function allBridges(): Bridge[] {
  return [...KNOWN_BRIDGES, ...extraBridges];
}

export function setCustomBridges(bridges: Bridge[]): void {
  extraBridges = bridges;
}

/** Hauteur requise = hauteur véhicule + marge de sécurité. */
export function requiredClearance(vehicle: VehicleProfile): number {
  return vehicle.heightM + vehicle.clearanceMarginM;
}

/**
 * Analyse les tronçons d'un itinéraire et signale les ponts dont la hauteur
 * libre est inférieure à la hauteur requise du véhicule.
 *
 * Approche : pour chaque pont, on teste sa distance à chaque segment de la
 * polyline. S'il est assez proche d'un tronçon ET trop bas → avertissement.
 */
export function detectBridgeConflicts(
  legs: RouteLeg[],
  vehicle: VehicleProfile,
  bridges: Bridge[] = allBridges()
): BridgeWarning[] {
  const required = requiredClearance(vehicle);
  const warnings: BridgeWarning[] = [];
  const tooLow = bridges.filter((b) => b.maxHeightM < required);

  legs.forEach((leg, legIndex) => {
    const pts = leg.geometry;
    for (const bridge of tooLow) {
      let near = false;
      for (let i = 0; i + 1 < pts.length; i++) {
        if (
          pointToSegmentMeters(bridge.coordinate, pts[i], pts[i + 1]) <=
          ON_ROUTE_THRESHOLD_M
        ) {
          near = true;
          break;
        }
      }
      if (near && !warnings.some((w) => w.bridge.id === bridge.id)) {
        warnings.push({ bridge, legIndex, vehicleHeightM: vehicle.heightM });
      }
    }
  });

  return warnings;
}
