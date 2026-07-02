import { InterventionOperation, Part, SheetHeader } from '@/types';
import { OPERATION_CATALOG } from '@/data/maintenancePlans';
import { recognizeText } from './ocr';

export interface ParsedSheet {
  header: SheetHeader | null;
  mileageKm: number | null;
  date: string | null; // ISO YYYY-MM-DD
  mechanic: string | null;
  operations: InterventionOperation[];
  parts: Part[];
  laborHours: number | null;
  costEuros: number | null;
  notes: string | null;
  /** Champs qui n'ont pas pu être lus avec certitude (à vérifier). */
  lowConfidence: string[];
}

/** Extrait le code machine `FE:<vehicleId>:<formId>` de l'en-tête. */
export function parseHeader(text: string): SheetHeader | null {
  // Tolère les erreurs OCR fréquentes : F E : / espaces / O↔0.
  const m = text.match(/F\s*E\s*[:;]\s*([A-Za-z0-9_]+)\s*[:;]\s*([A-Za-z0-9_]+)/);
  if (!m) return null;
  return { vehicleId: m[1], formId: m[2] };
}

function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

/**
 * Cherche la valeur après une ancre (KM>, DATE>…) sur la même ligne.
 * S'arrête à l'ancre suivante si plusieurs champs partagent une ligne
 * (ex. « HEURES> 1,5   COUT> 245 »).
 */
function afterAnchor(text: string, anchor: string): string | null {
  const re = new RegExp(anchor + '\\s*[:>]?\\s*(.+)', 'i');
  const line = text.split(/\r?\n/).find((l) => re.test(l));
  if (!line) return null;
  const m = line.match(re);
  if (!m) return null;
  let val = m[1].trim();
  // Coupe à la prochaine ancre du type MOT> ou MOT: (au moins 3 lettres).
  const nextAnchor = val.search(/[A-Za-zÀ-ÿ]{3,}\s*[:>]/);
  if (nextAnchor > 0) val = val.slice(0, nextAnchor).trim();
  return val;
}

/** Normalise une date « JJ MM AAAA » (séparateurs variés) en ISO. */
export function parseDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m;
  const yy = y.length === 2 ? '20' + y : y;
  const day = d.padStart(2, '0');
  const mon = mo.padStart(2, '0');
  if (+mon < 1 || +mon > 12 || +day < 1 || +day > 31) return null;
  return `${yy}-${mon}-${day}`;
}

/** Une case est cochée si la ligne du code contient un X/✓ dans/à côté du crochet. */
function isChecked(line: string): boolean {
  return /\[\s*[xX✓✔√]\s*\]/.test(line) || /^\s*[xX✓✔√]\s+/.test(line);
}

/**
 * Analyse le texte OCR d'une fiche remplie en données structurées.
 * Fonction pure et testable (aucun accès réseau).
 */
export function parseMaintenanceSheet(rawText: string): ParsedSheet {
  const lines = rawText.split(/\r?\n/);
  const lowConfidence: string[] = [];

  const header = parseHeader(rawText);
  if (!header) lowConfidence.push('code fiche');

  const kmRaw = afterAnchor(rawText, 'KM');
  const mileageKm = kmRaw ? toNumber(kmRaw) : null;
  if (mileageKm === null) lowConfidence.push('kilométrage');

  const dateRaw = afterAnchor(rawText, 'DATE');
  const date = dateRaw ? parseDate(dateRaw) : null;
  if (!date) lowConfidence.push('date');

  const mechanic = afterAnchor(rawText, 'MECA');

  const hoursRaw = afterAnchor(rawText, 'HEURES');
  const laborHours = hoursRaw ? toNumber(hoursRaw) : null;

  const costRaw = afterAnchor(rawText, 'COUT');
  const costEuros = costRaw ? toNumber(costRaw) : null;

  const notes = afterAnchor(rawText, 'NOTES');

  // Opérations : on repère chaque code du catalogue dans le texte.
  const operations: InterventionOperation[] = [];
  for (const op of OPERATION_CATALOG) {
    const line = lines.find((l) => new RegExp(`\\b${op.code}\\b`).test(l));
    if (line) {
      operations.push({ code: op.code, label: op.label, done: isChecked(line) });
    }
  }

  // Pièces : ligne PIECES> "REF x QTE" (best effort).
  const parts: Part[] = [];
  const partsRaw = afterAnchor(rawText, 'PIECES');
  if (partsRaw) {
    const pm = partsRaw.match(/([A-Za-z0-9\-]+)\s*[xX*]\s*(\d+)/);
    if (pm) {
      parts.push({ reference: pm[1], label: pm[1], qty: parseInt(pm[2], 10) });
    }
  }

  return {
    header,
    mileageKm,
    date,
    mechanic: mechanic || null,
    operations,
    parts,
    laborHours,
    costEuros,
    notes: notes || null,
    lowConfidence,
  };
}

/** Pipeline complet : photo de la fiche → texte OCR → données structurées. */
export async function scanMaintenanceSheet(base64DataUri: string): Promise<ParsedSheet> {
  const text = await recognizeText(base64DataUri);
  const parsed = parseMaintenanceSheet(text);
  return parsed;
}
