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

// ---------------------------------------------------------------------------
// Employés & droits d'accès aux fonctions de l'application
// ---------------------------------------------------------------------------

/** Clé d'une fonction de l'app pouvant être attribuée ou non à un employé. */
export type PermissionKey =
  | 'tour.capture'
  | 'tour.stops'
  | 'tour.optimize'
  | 'tour.navigate'
  | 'tour.settings'
  | 'fleet.view'
  | 'fleet.vehicle.manage'
  | 'fleet.intervention.create'
  | 'fleet.paper.print'
  | 'fleet.paper.scan'
  | 'pagilog.sync'
  | 'admin.employees';

export interface Employee {
  id: string;
  name: string;
  /** Code PIN à 4 chiffres (optionnel) pour protéger le profil. */
  pin?: string;
  /** Un administrateur possède toutes les permissions. */
  isAdmin: boolean;
  /** Permissions accordées explicitement (ignorées si isAdmin). */
  permissions: Partial<Record<PermissionKey, boolean>>;
  /** Rôle appliqué (modèle de droits), à titre indicatif. */
  roleId?: string;
  /** true = profil géré de façon centralisée depuis PAGILOG (lecture seule locale). */
  managed?: boolean;
  /** Identifiant côté PAGILOG (mapping annuaire). */
  pagilogId?: string;
  createdAt: number;
}

/** Modèle de rôle : un lot de fonctions attribuées en un clic. */
export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  /** Si vrai, le rôle confère tous les droits (administrateur). */
  isAdmin?: boolean;
  /** Permissions accordées par ce rôle. */
  permissions: PermissionKey[];
}
