import {
  exportVehiclesCsv,
  importVehiclesCsv,
  exportInterventionsCsv,
  toCsv,
  parseCsv,
  interventionToRow,
} from '@/services/pagilog';
import { Intervention, Vehicle } from '@/types';

const veh: Vehicle = {
  id: 'v1',
  plate: 'AB-123-CD',
  make: 'Renault',
  model: 'Master',
  year: 2021,
  mileageKm: 150000,
  createdAt: 1,
};

const intervention: Intervention = {
  id: 'i1',
  vehicleId: 'v1',
  date: '2026-07-02',
  mileageKm: 152340,
  operations: [
    { code: 'VIDANGE', label: 'x', done: true },
    { code: 'FREINS_AV', label: 'x', done: false },
  ],
  parts: [{ reference: 'FILT-123', label: 'filtre', qty: 2 }],
  laborHours: 1.5,
  costEuros: 245.9,
  mechanic: 'Jean Dupont',
  notes: 'RAS',
  source: 'paper-ocr',
  syncStatus: 'local',
  createdAt: 1,
};

describe('pagilog CSV', () => {
  test('export véhicules : en-tête et ligne', () => {
    const csv = exportVehiclesCsv([veh]);
    expect(csv.split('\n')[0]).toBe('immatriculation;marque;modele;annee;vin;km;pagilog_id');
    expect(csv).toContain('AB-123-CD;Renault;Master;2021');
  });

  test('import véhicules : aller-retour', () => {
    const csv = exportVehiclesCsv([veh]);
    const back = importVehiclesCsv(csv, 1000);
    expect(back[0].plate).toBe('AB-123-CD');
    expect(back[0].mileageKm).toBe(150000);
    expect(back[0].year).toBe(2021);
  });

  test('interventions : seules les opérations faites sont exportées', () => {
    const row = interventionToRow(intervention, veh);
    expect(row.operations).toBe('VIDANGE');
    expect(row.pieces).toBe('FILT-123x2');
    const csv = exportInterventionsCsv([intervention], [veh]);
    expect(csv).toContain('AB-123-CD;2026-07-02;152340;VIDANGE');
  });

  test('échappement CSV', () => {
    const csv = toCsv(['a', 'b'], [{ a: 'x;y', b: 'dit "salut"' }]);
    expect(csv).toContain('"x;y"');
    expect(csv).toContain('"dit ""salut"""');
    const parsed = parseCsv(csv);
    expect(parsed[0]).toEqual({ a: 'x;y', b: 'dit "salut"' });
  });

  test('import ignore les lignes sans immatriculation', () => {
    const csv = 'immatriculation;marque;modele;annee;vin;km;pagilog_id\n;;;;;;\nXY-999-ZZ;Iveco;Daily;;;;';
    const back = importVehiclesCsv(csv, 1000);
    expect(back).toHaveLength(1);
    expect(back[0].plate).toBe('XY-999-ZZ');
  });
});
