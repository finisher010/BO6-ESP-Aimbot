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

// ---------------------------------------------------------------------------
// Module Entretien du parc de véhicules (maintenance)
// ---------------------------------------------------------------------------

export interface Vehicle {
  id: string;
  /** Immatriculation, sert aussi de clé d'échange avec PAGILOG. */
  plate: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  /** Kilométrage courant (dernier relevé connu). */
  mileageKm: number;
  /** Identifiant PAGILOG si connu (mapping). */
  pagilogId?: string;
  createdAt: number;
}

/** Une opération type du catalogue (vidange, freins…). */
export interface OperationDef {
  code: string;
  label: string;
  /** Périodicité recommandée en km (0 = pas de périodicité km). */
  intervalKm: number;
  /** Périodicité recommandée en mois (0 = aucune). */
  intervalMonths: number;
}

/** Opération réellement effectuée/à effectuer sur une fiche. */
export interface InterventionOperation {
  code: string;
  label: string;
  done: boolean;
}

export interface Part {
  reference: string;
  label: string;
  qty: number;
  unitCostEuros?: number;
}

export type InterventionSource = 'app' | 'paper-ocr' | 'pagilog';
export type SyncStatus = 'local' | 'synced' | 'error';

export interface Intervention {
  id: string;
  vehicleId: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  mileageKm: number;
  operations: InterventionOperation[];
  parts: Part[];
  laborHours?: number;
  costEuros?: number;
  mechanic?: string;
  notes?: string;
  source: InterventionSource;
  syncStatus: SyncStatus;
  /** Renseigné après scan papier : confiance et champs bruts. */
  ocrRawText?: string;
  createdAt: number;
}

/** Échéance calculée pour une opération sur un véhicule. */
export interface MaintenanceDue {
  vehicle: Vehicle;
  operation: OperationDef;
  /** Km restants avant échéance (négatif = en retard). */
  kmRemaining: number | null;
  /** Jours restants avant échéance (négatif = en retard). */
  daysRemaining: number | null;
  severity: 'ok' | 'soon' | 'overdue';
}

/** En-tête machine d'une fiche papier, lu automatiquement au scan. */
export interface SheetHeader {
  vehicleId: string;
  formId: string;
}
