import { Intervention, MaintenanceDue, OperationDef, Vehicle } from '@/types';
import { OPERATION_CATALOG } from '@/data/maintenancePlans';

export interface ScheduleThresholds {
  soonKm: number;
  soonDays: number;
}

const DEFAULT_THRESHOLDS: ScheduleThresholds = { soonKm: 2000, soonDays: 30 };

/** Nombre de jours entre deux dates ISO (YYYY-MM-DD). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Dernière intervention où l'opération `code` a été réellement effectuée.
 * On se base sur la date ISO (tri lexicographique = tri chronologique).
 */
export function lastDoneFor(
  vehicleId: string,
  code: string,
  interventions: Intervention[]
): Intervention | null {
  const done = interventions
    .filter(
      (i) =>
        i.vehicleId === vehicleId &&
        i.operations.some((op) => op.code === code && op.done)
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return done[0] ?? null;
}

/**
 * Calcule les échéances d'entretien d'un véhicule.
 * `todayIso` est injecté pour rester pur et testable.
 */
export function computeDue(
  vehicle: Vehicle,
  interventions: Intervention[],
  todayIso: string,
  operations: OperationDef[] = OPERATION_CATALOG,
  thresholds: ScheduleThresholds = DEFAULT_THRESHOLDS
): MaintenanceDue[] {
  const results: MaintenanceDue[] = [];

  for (const op of operations) {
    if (op.intervalKm === 0 && op.intervalMonths === 0) continue;
    const last = lastDoneFor(vehicle.id, op.code, interventions);

    let kmRemaining: number | null = null;
    let daysRemaining: number | null = null;

    if (last) {
      if (op.intervalKm > 0) {
        const kmSince = vehicle.mileageKm - last.mileageKm;
        kmRemaining = op.intervalKm - kmSince;
      }
      if (op.intervalMonths > 0) {
        const daysSince = daysBetween(last.date, todayIso);
        daysRemaining = op.intervalMonths * 30 - daysSince;
      }
    }

    const severity = computeSeverity(kmRemaining, daysRemaining, !!last, thresholds);
    results.push({ vehicle, operation: op, kmRemaining, daysRemaining, severity });
  }

  // Trie : en retard d'abord, puis bientôt, puis ok.
  const rank = { overdue: 0, soon: 1, ok: 2 } as const;
  return results.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function computeSeverity(
  kmRemaining: number | null,
  daysRemaining: number | null,
  hasHistory: boolean,
  t: ScheduleThresholds
): MaintenanceDue['severity'] {
  // Aucun historique : on invite à saisir un premier entretien de référence.
  if (!hasHistory) return 'soon';

  const overdue =
    (kmRemaining !== null && kmRemaining <= 0) ||
    (daysRemaining !== null && daysRemaining <= 0);
  if (overdue) return 'overdue';

  const soon =
    (kmRemaining !== null && kmRemaining <= t.soonKm) ||
    (daysRemaining !== null && daysRemaining <= t.soonDays);
  return soon ? 'soon' : 'ok';
}

/** Nombre d'échéances à traiter (retard + bientôt) sur un véhicule. */
export function dueCount(due: MaintenanceDue[]): number {
  return due.filter((d) => d.severity !== 'ok').length;
}
