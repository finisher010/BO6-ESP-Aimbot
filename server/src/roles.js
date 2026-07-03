// Catalogue de rôles, aligné sur l'application (data/roles.ts).
// Permet à l'API de renvoyer /roles et de valider les rôles reçus.
const ROLES = [
  {
    id: 'chauffeur',
    name: 'Chauffeur',
    permissions: ['tour.capture', 'tour.stops', 'tour.optimize', 'tour.navigate', 'tour.settings'],
  },
  {
    id: 'mecanicien',
    name: 'Mécanicien',
    permissions: ['fleet.view', 'fleet.intervention.create', 'fleet.paper.print', 'fleet.paper.scan'],
  },
  {
    id: 'gestionnaire',
    name: 'Gestionnaire de parc',
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
  { id: 'admin', name: 'Administrateur', isAdmin: true, permissions: [] },
];

module.exports = { ROLES };
