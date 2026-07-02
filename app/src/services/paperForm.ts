import { OperationDef, Vehicle } from '@/types';
import { OPERATION_CATALOG } from '@/data/maintenancePlans';

/**
 * Génère une « fiche d'entretien » papier, imprimable, que le mécanicien
 * remplit à la main. Le gabarit est conçu pour une relecture OCR fiable :
 *
 *  - un code machine `FE:<vehicleId>:<formId>` en tête → l'app associe
 *    automatiquement le scan au bon véhicule ;
 *  - des ancres en début de champ (`KM>`, `DATE>`, `MECA>`, `HEURES>`,
 *    `COUT>`, `NOTES>`) qui survivent au bruit de l'OCR ;
 *  - une case `[ ]` suivie du CODE opération en MAJUSCULES pour chaque ligne.
 *
 * Voir `maintenanceOcr.ts` pour l'analyse du scan.
 */

export function makeFormId(seed: number): string {
  return 'F' + seed.toString(36).toUpperCase();
}

export function sheetCode(vehicleId: string, formId: string): string {
  return `FE:${vehicleId}:${formId}`;
}

export interface SheetOptions {
  companyName?: string;
  operations?: OperationDef[];
}

/** Version texte (utile pour aperçu, tests et fiabilité du parsing). */
export function buildSheetText(
  vehicle: Vehicle,
  formId: string,
  opts: SheetOptions = {}
): string {
  const ops = opts.operations ?? OPERATION_CATALOG;
  const lines = [
    `${opts.companyName ?? 'PARC VÉHICULES'} — FICHE D'ENTRETIEN`,
    sheetCode(vehicle.id, formId),
    `Véhicule: ${vehicle.make} ${vehicle.model}   Immat: ${vehicle.plate}`,
    '----------------------------------------',
    'KM>',
    'DATE>   __ / __ / ____',
    'MECA>',
    '----------------------------------------',
    'OPÉRATIONS (cocher la case et compléter):',
    ...ops.map((o) => `[ ] ${o.code}  ${o.label}`),
    '----------------------------------------',
    'PIECES> (REF x QTE)',
    'HEURES>        COUT>',
    'NOTES>',
  ];
  return lines.join('\n');
}

/** Version HTML imprimable (via expo-print). */
export function buildSheetHtml(
  vehicle: Vehicle,
  formId: string,
  opts: SheetOptions = {}
): string {
  const ops = opts.operations ?? OPERATION_CATALOG;
  const company = escapeHtml(opts.companyName ?? 'PARC VÉHICULES');
  const code = sheetCode(vehicle.id, formId);
  const opRows = ops
    .map(
      (o) => `
      <tr>
        <td class="cb">[&nbsp;&nbsp;]</td>
        <td class="code">${escapeHtml(o.code)}</td>
        <td>${escapeHtml(o.label)}</td>
        <td class="fill"></td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
  <style>
    * { font-family: Arial, sans-serif; color: #111; }
    body { padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .code { font-family: 'Courier New', monospace; font-weight: bold; }
    .machine { font-family: 'Courier New', monospace; font-size: 16px;
      letter-spacing: 2px; border: 2px solid #111; padding: 6px 10px;
      display: inline-block; margin: 6px 0; }
    .meta { font-size: 13px; margin-bottom: 10px; }
    .field { font-size: 15px; margin: 10px 0; }
    .anchor { font-family: 'Courier New', monospace; font-weight: bold; }
    .line { border-bottom: 1px solid #444; display: inline-block;
      min-width: 60%; height: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { border: 1px solid #999; padding: 6px 8px; font-size: 14px; }
    td.cb { font-family: 'Courier New', monospace; width: 34px; text-align: center; }
    td.code { font-family: 'Courier New', monospace; font-weight: bold; width: 90px; }
    td.fill { width: 30%; }
    .hint { font-size: 11px; color: #666; margin-top: 12px; }
  </style></head><body>
    <h1>${company} — FICHE D'ENTRETIEN</h1>
    <div class="machine">${escapeHtml(code)}</div>
    <div class="meta">Véhicule : <b>${escapeHtml(vehicle.make)} ${escapeHtml(
    vehicle.model
  )}</b> &nbsp; Immatriculation : <b>${escapeHtml(vehicle.plate)}</b></div>

    <div class="field"><span class="anchor">KM&gt;</span> <span class="line"></span></div>
    <div class="field"><span class="anchor">DATE&gt;</span> __ / __ / ____</div>
    <div class="field"><span class="anchor">MECA&gt;</span> <span class="line"></span></div>

    <table>
      <tr><th>✓</th><th>Code</th><th>Opération</th><th>Détail / pièce</th></tr>
      ${opRows}
    </table>

    <div class="field" style="margin-top:14px"><span class="anchor">PIECES&gt;</span> <span class="line"></span></div>
    <div class="field"><span class="anchor">HEURES&gt;</span> <span class="line" style="min-width:20%"></span>
      &nbsp;&nbsp; <span class="anchor">COUT&gt;</span> <span class="line" style="min-width:20%"></span> €</div>
    <div class="field"><span class="anchor">NOTES&gt;</span> <span class="line" style="min-width:80%"></span></div>

    <div class="hint">Cochez d'un <b>X</b> les cases. Écrivez lisiblement à côté des repères
      (KM&gt;, DATE&gt;…). Ne raturez pas le code en tête : il permet la lecture automatique.</div>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
