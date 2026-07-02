import { Intervention, Vehicle } from '@/types';

/**
 * Intégration PAGILOG.
 *
 * Le format d'échange exact de PAGILOG n'étant pas public, cette couche est
 * volontairement isolée et repose sur deux mécanismes robustes et courants :
 *
 *   1. Export / import CSV (UTF-8, séparateur `;` — usage FR) : fonctionne avec
 *      quasiment tous les logiciels de parc, sans dépendance en ligne.
 *   2. Un adaptateur REST optionnel (`PagilogConfig`) : à activer et paramétrer
 *      dès que l'URL et l'authentification PAGILOG sont connues.
 *
 * Pour brancher l'API réelle : remplir `pushInterventions` / `pullVehicles`
 * ci-dessous. Le reste de l'app n'a pas besoin d'être modifié.
 */

// --- Mapping canonique (colonnes stables) ---------------------------------

export const VEHICLE_COLUMNS = [
  'immatriculation',
  'marque',
  'modele',
  'annee',
  'vin',
  'km',
  'pagilog_id',
] as const;

export const INTERVENTION_COLUMNS = [
  'immatriculation',
  'date',
  'km',
  'operations',
  'pieces',
  'heures',
  'cout_euros',
  'mecanicien',
  'notes',
  'source',
] as const;

export function vehicleToRow(v: Vehicle): Record<string, string> {
  return {
    immatriculation: v.plate,
    marque: v.make,
    modele: v.model,
    annee: v.year ? String(v.year) : '',
    vin: v.vin ?? '',
    km: String(v.mileageKm),
    pagilog_id: v.pagilogId ?? '',
  };
}

export function interventionToRow(
  i: Intervention,
  vehicle: Vehicle | undefined
): Record<string, string> {
  return {
    immatriculation: vehicle?.plate ?? i.vehicleId,
    date: i.date,
    km: String(i.mileageKm),
    operations: i.operations
      .filter((o) => o.done)
      .map((o) => o.code)
      .join('|'),
    pieces: i.parts.map((p) => `${p.reference}x${p.qty}`).join('|'),
    heures: i.laborHours != null ? String(i.laborHours) : '',
    cout_euros: i.costEuros != null ? String(i.costEuros) : '',
    mecanicien: i.mechanic ?? '',
    notes: (i.notes ?? '').replace(/\r?\n/g, ' '),
    source: i.source,
  };
}

// --- CSV (séparateur ;) ----------------------------------------------------

function csvEscape(value: string): string {
  if (/[";\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}

export function toCsv(columns: readonly string[], rows: Record<string, string>[]): string {
  const header = columns.join(';');
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c] ?? '')).join(';'))
    .join('\n');
  return `${header}\n${body}`;
}

/** Parse un CSV `;` en lignes objets. Gère les guillemets simples. */
export function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const columns = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const obj: Record<string, string> = {};
    columns.forEach((c, i) => (obj[c] = cells[i] ?? ''));
    return obj;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ';') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function exportVehiclesCsv(vehicles: Vehicle[]): string {
  return toCsv(VEHICLE_COLUMNS, vehicles.map(vehicleToRow));
}

export function exportInterventionsCsv(
  interventions: Intervention[],
  vehicles: Vehicle[]
): string {
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  return toCsv(
    INTERVENTION_COLUMNS,
    interventions.map((i) => interventionToRow(i, byId.get(i.vehicleId)))
  );
}

/** Importe une flotte depuis un CSV PAGILOG (ou tout logiciel de parc). */
export function importVehiclesCsv(csv: string, now: number): Vehicle[] {
  return parseCsv(csv)
    .filter((r) => (r.immatriculation ?? '').trim().length > 0)
    .map((r, idx) => ({
      id: `veh_${now.toString(36)}_${idx}`,
      plate: r.immatriculation.trim(),
      make: r.marque ?? '',
      model: r.modele ?? '',
      year: r.annee ? parseInt(r.annee, 10) || undefined : undefined,
      vin: r.vin || undefined,
      mileageKm: parseInt(r.km, 10) || 0,
      pagilogId: r.pagilog_id || undefined,
      createdAt: now + idx,
    }));
}

// --- Adaptateur REST (optionnel) ------------------------------------------

export interface PagilogConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
}

export const EMPTY_CONFIG: PagilogConfig = { enabled: false, baseUrl: '', apiKey: '' };

export interface SyncResult {
  ok: boolean;
  pushed: number;
  message: string;
}

/**
 * Pousse des interventions vers PAGILOG via REST.
 * Endpoint/charge utile à adapter au contrat réel de PAGILOG.
 */
export async function pushInterventions(
  config: PagilogConfig,
  interventions: Intervention[],
  vehicles: Vehicle[]
): Promise<SyncResult> {
  if (!config.enabled || !config.baseUrl) {
    return { ok: false, pushed: 0, message: 'Intégration PAGILOG non configurée.' };
  }
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const payload = interventions.map((i) => interventionToRow(i, byId.get(i.vehicleId)));
  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/interventions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ interventions: payload }),
    });
    if (!res.ok) {
      return { ok: false, pushed: 0, message: `PAGILOG a répondu ${res.status}` };
    }
    return { ok: true, pushed: payload.length, message: `${payload.length} interventions envoyées.` };
  } catch (e: any) {
    return { ok: false, pushed: 0, message: e.message ?? String(e) };
  }
}

/** Récupère la flotte depuis PAGILOG via REST. */
export async function pullVehicles(config: PagilogConfig, now: number): Promise<Vehicle[]> {
  if (!config.enabled || !config.baseUrl) {
    throw new Error('Intégration PAGILOG non configurée.');
  }
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/vehicles`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  if (!res.ok) throw new Error(`PAGILOG a répondu ${res.status}`);
  const data = (await res.json()) as any[];
  // Adapter le mapping au schéma réel renvoyé par PAGILOG.
  return data.map((r, idx) => ({
    id: `veh_${now.toString(36)}_${idx}`,
    plate: r.immatriculation ?? r.plate ?? '',
    make: r.marque ?? r.make ?? '',
    model: r.modele ?? r.model ?? '',
    year: r.annee ?? r.year,
    vin: r.vin,
    mileageKm: r.km ?? r.mileage ?? 0,
    pagilogId: String(r.id ?? r.pagilog_id ?? ''),
    createdAt: now + idx,
  }));
}
