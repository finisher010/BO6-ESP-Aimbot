import * as XLSX from 'xlsx';
import { Intervention, Vehicle } from '@/types';
import {
  INTERVENTION_COLUMNS,
  VEHICLE_COLUMNS,
  interventionToRow,
  recordsToVehicles,
  vehicleToRow,
} from './pagilog';

/**
 * Import/export Excel (.xlsx) en complément du CSV, pour l'échange avec PAGILOG
 * ou tout tableur. S'appuie sur le même mapping de colonnes que `pagilog.ts`.
 */

function rowsToXlsxBase64(
  columns: readonly string[],
  rows: Record<string, string>[],
  sheetName: string
): string {
  const aoa = [columns as unknown as string[], ...rows.map((r) => columns.map((c) => r[c] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

export function exportVehiclesXlsx(vehicles: Vehicle[]): string {
  return rowsToXlsxBase64(VEHICLE_COLUMNS, vehicles.map(vehicleToRow), 'Vehicules');
}

export function exportInterventionsXlsx(
  interventions: Intervention[],
  vehicles: Vehicle[]
): string {
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const rows = interventions.map((i) => interventionToRow(i, byId.get(i.vehicleId)));
  return rowsToXlsxBase64(INTERVENTION_COLUMNS, rows, 'Interventions');
}

/** Lit la première feuille d'un .xlsx (base64) en lignes objets. */
export function xlsxBase64ToRecords(base64: string): Record<string, string>[] {
  const wb = XLSX.read(base64, { type: 'base64' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const ws = wb.Sheets[first];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as Record<string, string>[];
}

/** Importe une flotte depuis un fichier Excel (base64). */
export function importVehiclesXlsx(base64: string, now: number): Vehicle[] {
  return recordsToVehicles(xlsxBase64ToRecords(base64), now);
}
