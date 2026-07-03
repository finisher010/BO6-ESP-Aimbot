import { computeDue, daysBetween, lastDoneFor, dueCount } from '@/services/maintenanceSchedule';
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

const interventions: Intervention[] = [
  {
    id: 'i1',
    vehicleId: 'v1',
    date: '2026-01-10',
    mileageKm: 120000,
    operations: [
      { code: 'VIDANGE', label: 'x', done: true },
      { code: 'FREINS_AV', label: 'x', done: true },
    ],
    parts: [],
    source: 'app',
    syncStatus: 'local',
    createdAt: 1,
  },
  {
    id: 'i2',
    vehicleId: 'v1',
    date: '2025-06-01',
    mileageKm: 100000,
    operations: [{ code: 'VIDANGE', label: 'x', done: true }],
    parts: [],
    source: 'app',
    syncStatus: 'local',
    createdAt: 1,
  },
];

describe('maintenanceSchedule', () => {
  test('daysBetween', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
  });

  test('lastDoneFor prend la plus récente', () => {
    expect(lastDoneFor('v1', 'VIDANGE', interventions)?.id).toBe('i1');
  });

  test('vidange en retard sur le kilométrage', () => {
    const due = computeDue(veh, interventions, '2026-07-02');
    const v = due.find((d) => d.operation.code === 'VIDANGE')!;
    // 150000-120000 = 30000 km, intervalle 30000 → reste 0 → en retard
    expect(v.kmRemaining).toBe(0);
    expect(v.severity).toBe('overdue');
  });

  test('freins encore ok', () => {
    const due = computeDue(veh, interventions, '2026-07-02');
    const f = due.find((d) => d.operation.code === 'FREINS_AV')!;
    expect(f.kmRemaining).toBe(10000);
    expect(f.severity).toBe('ok');
  });

  test('opération sans historique → à initialiser', () => {
    const due = computeDue(veh, interventions, '2026-07-02');
    const clim = due.find((d) => d.operation.code === 'CLIM')!;
    expect(clim.kmRemaining).toBeNull();
    expect(clim.severity).toBe('soon');
  });

  test('tri : en retard en premier', () => {
    const due = computeDue(veh, interventions, '2026-07-02');
    expect(due[0].severity).toBe('overdue');
    expect(dueCount(due)).toBeGreaterThan(0);
  });
});
