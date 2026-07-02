import { PermissionKey } from '@/types';

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  /** Groupe d'affichage dans l'écran de gestion. */
  group: 'Tournée' | 'Entretien' | 'Administration';
}

/**
 * Catalogue des fonctions de l'application qu'un administrateur peut
 * attribuer ou non à chaque employé.
 */
export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: 'tour.capture', label: 'Scanner des adresses', group: 'Tournée' },
  { key: 'tour.stops', label: 'Gérer les arrêts', group: 'Tournée' },
  { key: 'tour.optimize', label: 'Optimiser la tournée', group: 'Tournée' },
  { key: 'tour.navigate', label: 'Guidage vocal', group: 'Tournée' },
  { key: 'tour.settings', label: 'Paramètres tournée & véhicule', group: 'Tournée' },

  { key: 'fleet.view', label: 'Consulter le parc', group: 'Entretien' },
  { key: 'fleet.vehicle.manage', label: 'Ajouter / supprimer des véhicules', group: 'Entretien' },
  { key: 'fleet.intervention.create', label: 'Saisir une fiche d’entretien', group: 'Entretien' },
  { key: 'fleet.paper.print', label: 'Imprimer une fiche papier', group: 'Entretien' },
  { key: 'fleet.paper.scan', label: 'Scanner une fiche remplie', group: 'Entretien' },

  { key: 'pagilog.sync', label: 'Synchronisation PAGILOG', group: 'Administration' },
  { key: 'admin.employees', label: 'Gérer les employés & droits', group: 'Administration' },
];

export const PERMISSION_GROUPS: PermissionDef['group'][] = [
  'Tournée',
  'Entretien',
  'Administration',
];
