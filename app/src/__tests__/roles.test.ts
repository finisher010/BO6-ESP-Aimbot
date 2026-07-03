import { applyRole, can, permissionsFromKeys } from '@/services/auth';
import { ROLE_TEMPLATES, roleById } from '@/data/roles';
import { Employee } from '@/types';

const base: Employee = {
  id: 'e',
  name: 'Test',
  isAdmin: false,
  permissions: { 'pagilog.sync': true },
  createdAt: 1,
};

describe('rôles', () => {
  test('appliquer « Chauffeur » donne les droits tournée et retire le reste', () => {
    const chauffeur = roleById('chauffeur')!;
    const e = applyRole(base, chauffeur);
    expect(e.roleId).toBe('chauffeur');
    expect(e.isAdmin).toBe(false);
    expect(can(e, 'tour.navigate')).toBe(true);
    expect(can(e, 'tour.capture')).toBe(true);
    // L'ancienne permission pagilog.sync n'est plus là.
    expect(can(e, 'pagilog.sync')).toBe(false);
  });

  test('appliquer « Mécanicien »', () => {
    const e = applyRole(base, roleById('mecanicien')!);
    expect(can(e, 'fleet.paper.scan')).toBe(true);
    expect(can(e, 'fleet.intervention.create')).toBe(true);
    expect(can(e, 'fleet.vehicle.manage')).toBe(false);
  });

  test('appliquer « Administrateur » confère tous les droits', () => {
    const e = applyRole(base, roleById('admin')!);
    expect(e.isAdmin).toBe(true);
    expect(can(e, 'admin.employees')).toBe(true);
  });

  test('permissionsFromKeys', () => {
    expect(permissionsFromKeys(['tour.stops', 'tour.optimize'])).toEqual({
      'tour.stops': true,
      'tour.optimize': true,
    });
  });

  test('tous les rôles ont un id et un nom', () => {
    for (const r of ROLE_TEMPLATES) {
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
    }
  });
});
