import {
  exportVehiclesXlsx,
  importVehiclesXlsx,
  exportInterventionsXlsx,
  xlsxBase64ToRecords,
} from '@/services/excel';
import { recordsToVehicles } from '@/services/pagilog';
import { Intervention, Vehicle } from '@/types';

const veh: Vehicle = {
  id: 'v1',
  plate: 'AB-123-CD',
  make: 'Renault',
  model: 'Master',
  year: 2021,
  vin: 'VF1XYZ',
  pagilogId: 'P42',
  mileageKm: 150000,
  createdAt: 1,
};

describe('recordsToVehicles', () => {
  test('gère les alias de colonnes et met l’immat en majuscules', () => {
    const rows = [{ Immatriculation: 'ab-12-cd', Marque: 'Iveco', Kilométrage: '80000', ID: 'X9' }];
    const vs = recordsToVehicles(rows, 1000);
    expect(vs[0].plate).toBe('AB-12-CD');
    expect(vs[0].mileageKm).toBe(80000);
    expect(vs[0].make).toBe('Iveco');
    expect(vs[0].pagilogId).toBe('X9');
  });

  test('ignore les lignes sans immatriculation', () => {
    expect(recordsToVehicles([{ Marque: 'x' }], 1)).toHaveLength(0);
  });
});

describe('excel (.xlsx)', () => {
  test('aller-retour véhicules', () => {
    const b64 = exportVehiclesXlsx([veh]);
    expect(typeof b64).toBe('string');
    const back = importVehiclesXlsx(b64, 2000);
    expect(back[0].plate).toBe('AB-123-CD');
    expect(back[0].mileageKm).toBe(150000);
    expect(back[0].year).toBe(2021);
    expect(back[0].vin).toBe('VF1XYZ');
    expect(back[0].pagilogId).toBe('P42');
  });

  test('export interventions lisible', () => {
    const intervention: Intervention = {
      id: 'i1',
      vehicleId: 'v1',
      date: '2026-07-02',
      mileageKm: 152340,
      operations: [{ code: 'VIDANGE', label: 'x', done: true }],
      parts: [],
      source: 'app',
      syncStatus: 'local',
      createdAt: 1,
    };
    const recs = xlsxBase64ToRecords(exportInterventionsXlsx([intervention], [veh]));
    expect(recs[0].immatriculation).toBe('AB-123-CD');
    expect(recs[0].operations).toBe('VIDANGE');
  });
});
