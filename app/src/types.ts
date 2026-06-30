// Types partagés de l'application de tournée.

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type StopStatus = 'pending' | 'done' | 'skipped';

export interface Stop {
  id: string;
  /** Adresse en texte, telle que lue par l'OCR ou saisie manuellement. */
  label: string;
  coordinate?: Coordinate;
  /** Renseignée par le géocodage : adresse normalisée. */
  resolvedAddress?: string;
  status: StopStatus;
  /** Note libre (code porte, étage, créneau…). */
  note?: string;
  /** Ordre dans la tournée optimisée (rempli par l'optimiseur). */
  order?: number;
  createdAt: number;
}

export interface VehicleProfile {
  /** Hauteur du véhicule en mètres (utilisée pour éviter les ponts bas). */
  heightM: number;
  /** Poids en tonnes (info, extensible pour limites de tonnage). */
  weightT: number;
  /** Marge de sécurité ajoutée à la hauteur véhicule, en mètres. */
  clearanceMarginM: number;
}

export interface Bridge {
  id: string;
  name: string;
  coordinate: Coordinate;
  /** Hauteur libre maximale sous le pont, en mètres. */
  maxHeightM: number;
  source?: string;
}

export interface RouteLeg {
  fromId: string;
  toId: string;
  distanceM: number;
  durationS: number;
  /** Polyline décodée de ce tronçon. */
  geometry: Coordinate[];
}

export interface OptimizedRoute {
  orderedStopIds: string[];
  legs: RouteLeg[];
  /** Manœuvres pas-à-pas pour le guidage vocal. */
  steps: NavStep[];
  totalDistanceM: number;
  totalDurationS: number;
  /** Ponts trop bas détectés sur le trajet. */
  bridgeWarnings: BridgeWarning[];
  computedAt: number;
}

export interface BridgeWarning {
  bridge: Bridge;
  /** Index du leg sur lequel le pont a été détecté. */
  legIndex: number;
  vehicleHeightM: number;
}

export interface NavStep {
  instruction: string;
  coordinate: Coordinate;
  distanceM: number;
  /** Type de manœuvre OSRM (turn, roundabout, arrive…). */
  maneuver: string;
  modifier?: string;
}
