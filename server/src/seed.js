// Données initiales, créées uniquement si la base est vide.
module.exports = {
  employees: [
    { id: '1001', name: 'Marie Chauffeur', role: 'chauffeur', pin: '2468' },
    { id: '1002', name: 'Paul Mécano', role: 'mecanicien' },
    { id: '1003', name: 'Sophie Gestion', role: 'gestionnaire' },
    { id: '1004', name: 'Léa Direction', admin: true },
    { id: '1005', name: 'Karim Polyvalent', permissions: ['tour.capture', 'fleet.view'] },
  ],
  vehicles: [
    { immatriculation: 'AB-123-CD', marque: 'Renault', modele: 'Master', annee: 2021, km: 152340, pagilog_id: 'V-01' },
    { immatriculation: 'EF-456-GH', marque: 'Iveco', modele: 'Daily', annee: 2019, km: 208750, pagilog_id: 'V-02' },
  ],
  interventions: [],
};
