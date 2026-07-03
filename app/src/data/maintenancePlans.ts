import { OperationDef } from '@/types';

/**
 * Catalogue des opérations d'entretien avec leur périodicité recommandée.
 * Valeurs typiques poids-lourd / utilitaire, ajustables par l'exploitant.
 *
 * Les `code` sont stables : ils servent d'ancres dans la fiche papier et le
 * mapping PAGILOG. Ne pas les renuméroter à la légère.
 */
export const OPERATION_CATALOG: OperationDef[] = [
  { code: 'VIDANGE', label: 'Vidange moteur + filtre à huile', intervalKm: 30000, intervalMonths: 12 },
  { code: 'FILTRE_AIR', label: 'Filtre à air', intervalKm: 45000, intervalMonths: 24 },
  { code: 'FILTRE_GO', label: 'Filtre à gasoil', intervalKm: 45000, intervalMonths: 24 },
  { code: 'FREINS_AV', label: 'Plaquettes / freins avant', intervalKm: 40000, intervalMonths: 0 },
  { code: 'FREINS_AR', label: 'Plaquettes / freins arrière', intervalKm: 50000, intervalMonths: 0 },
  { code: 'PNEUS', label: 'Contrôle / remplacement pneus', intervalKm: 60000, intervalMonths: 0 },
  { code: 'DISTRIB', label: 'Courroie de distribution', intervalKm: 120000, intervalMonths: 60 },
  { code: 'CLIM', label: 'Entretien climatisation', intervalKm: 0, intervalMonths: 24 },
  { code: 'GEOMETRIE', label: 'Géométrie / parallélisme', intervalKm: 40000, intervalMonths: 0 },
  { code: 'CT', label: 'Contrôle technique', intervalKm: 0, intervalMonths: 12 },
  { code: 'TACHY', label: 'Contrôle chronotachygraphe', intervalKm: 0, intervalMonths: 24 },
  { code: 'REVISION', label: 'Révision générale constructeur', intervalKm: 30000, intervalMonths: 12 },
];

export function operationByCode(code: string): OperationDef | undefined {
  return OPERATION_CATALOG.find((o) => o.code === code);
}
