import { RoleTemplate } from '@/types';

/**
 * Rôles prêts à l'emploi : appliquer un rôle coche d'un coup le bon lot de
 * fonctions pour un employé. Les `id` sont stables (utilisés par PAGILOG pour
 * la synchronisation centralisée des droits).
 */
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'chauffeur',
    name: 'Chauffeur',
    description: 'Tournées : adresses, optimisation et guidage.',
    permissions: ['tour.capture', 'tour.stops', 'tour.optimize', 'tour.navigate', 'tour.settings'],
  },
  {
    id: 'mecanicien',
    name: 'Mécanicien',
    description: 'Entretien : consulter le parc et remplir/scanner les fiches.',
    permissions: [
      'fleet.view',
      'fleet.intervention.create',
      'fleet.paper.print',
      'fleet.paper.scan',
    ],
  },
  {
    id: 'gestionnaire',
    name: 'Gestionnaire de parc',
    description: 'Gestion du parc, des fiches et synchronisation PAGILOG.',
    permissions: [
      'fleet.view',
      'fleet.vehicle.manage',
      'fleet.intervention.create',
      'fleet.paper.print',
      'fleet.paper.scan',
      'pagilog.sync',
      'tour.optimize',
      'tour.stops',
    ],
  },
  {
    id: 'exploitant',
    name: 'Exploitant',
    description: 'Tournées + suivi du parc, sans administration.',
    permissions: [
      'tour.capture',
      'tour.stops',
      'tour.optimize',
      'tour.navigate',
      'tour.settings',
      'fleet.view',
      'fleet.intervention.create',
    ],
  },
  {
    id: 'admin',
    name: 'Administrateur',
    description: 'Tous les droits, y compris la gestion des employés.',
    isAdmin: true,
    permissions: [],
  },
];

export function roleById(id: string | undefined): RoleTemplate | undefined {
  return id ? ROLE_TEMPLATES.find((r) => r.id === id) : undefined;
}
