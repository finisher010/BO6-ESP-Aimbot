import {
  remoteToEmployee,
  mapDirectory,
  employeeToRemote,
} from '@/services/directorySync';
import { can } from '@/services/auth';
import { Employee } from '@/types';

describe('remoteToEmployee', () => {
  test('mappe un enregistrement PAGILOG avec permissions explicites', () => {
    const e = remoteToEmployee(
      { id: '42', nom: 'Jean Dupont', permissions: ['tour.capture', 'tour.navigate'] },
      1000
    )!;
    expect(e.id).toBe('pag_42');
    expect(e.pagilogId).toBe('42');
    expect(e.name).toBe('Jean Dupont');
    expect(e.managed).toBe(true);
    expect(can(e, 'tour.capture')).toBe(true);
    expect(can(e, 'pagilog.sync')).toBe(false);
  });

  test('déduit les droits depuis un rôle', () => {
    const e = remoteToEmployee({ id: '7', name: 'Méca', role: 'mecanicien' }, 1)!;
    expect(e.roleId).toBe('mecanicien');
    expect(can(e, 'fleet.paper.scan')).toBe(true);
    expect(can(e, 'admin.employees')).toBe(false);
  });

  test('rôle admin → tous les droits', () => {
    const e = remoteToEmployee({ id: '1', name: 'Chef', role: 'admin' }, 1)!;
    expect(e.isAdmin).toBe(true);
    expect(can(e, 'pagilog.sync')).toBe(true);
  });

  test('champ admin booléen', () => {
    const e = remoteToEmployee({ id: '1', name: 'X', is_admin: true }, 1)!;
    expect(e.isAdmin).toBe(true);
  });

  test('permissions en chaîne séparée', () => {
    const e = remoteToEmployee({ id: '2', name: 'Y', permissions: 'tour.stops|tour.optimize' }, 1)!;
    expect(can(e, 'tour.stops')).toBe(true);
    expect(can(e, 'tour.optimize')).toBe(true);
  });

  test('ignore les clés inconnues', () => {
    const e = remoteToEmployee({ id: '3', name: 'Z', permissions: ['tour.stops', 'inexistant'] }, 1)!;
    expect(can(e, 'tour.stops')).toBe(true);
    // La clé inconnue est simplement ignorée.
    expect(Object.keys(e.permissions)).toEqual(['tour.stops']);
  });

  test('PIN à 4 chiffres conservé', () => {
    expect(remoteToEmployee({ id: '5', name: 'P', pin: '1234' }, 1)!.pin).toBe('1234');
    expect(remoteToEmployee({ id: '5', name: 'P', pin: '12' }, 1)!.pin).toBeUndefined();
  });

  test('enregistrement vide ignoré', () => {
    expect(remoteToEmployee({}, 1)).toBeNull();
  });
});

describe('mapDirectory', () => {
  test('accepte un tableau ou un objet { employees }', () => {
    const arr = mapDirectory([{ id: '1', name: 'A' }], 1);
    const obj = mapDirectory({ employees: [{ id: '1', name: 'A' }] }, 1);
    expect(arr).toHaveLength(1);
    expect(obj).toHaveLength(1);
  });
});

describe('employeeToRemote', () => {
  test('sérialise les permissions actives', () => {
    const e: Employee = {
      id: 'pag_9',
      name: 'Test',
      isAdmin: false,
      permissions: { 'tour.capture': true, 'tour.stops': false },
      roleId: 'chauffeur',
      pagilogId: '9',
      createdAt: 1,
    };
    const r = employeeToRemote(e);
    expect(r.id).toBe('9');
    expect(r.role).toBe('chauffeur');
    expect(r.permissions).toEqual(['tour.capture']);
  });
});
