import { can, grantedKeys, verifyPin, normalizePin, defaultAdmin } from '@/services/auth';
import { PERMISSION_CATALOG } from '@/data/permissions';
import { Employee } from '@/types';

const admin: Employee = {
  id: 'a',
  name: 'Admin',
  isAdmin: true,
  permissions: {},
  createdAt: 1,
};

const driver: Employee = {
  id: 'd',
  name: 'Chauffeur',
  isAdmin: false,
  permissions: { 'tour.capture': true, 'tour.navigate': true },
  createdAt: 1,
};

describe('can', () => {
  test('admin a tous les droits', () => {
    expect(can(admin, 'admin.employees')).toBe(true);
    expect(can(admin, 'pagilog.sync')).toBe(true);
  });

  test('employé : seulement les permissions accordées', () => {
    expect(can(driver, 'tour.capture')).toBe(true);
    expect(can(driver, 'tour.navigate')).toBe(true);
    expect(can(driver, 'pagilog.sync')).toBe(false);
    expect(can(driver, 'admin.employees')).toBe(false);
  });

  test('aucun employé connecté → aucun droit', () => {
    expect(can(null, 'tour.capture')).toBe(false);
  });
});

describe('grantedKeys', () => {
  test('admin → tout le catalogue', () => {
    expect(grantedKeys(admin)).toHaveLength(PERMISSION_CATALOG.length);
  });
  test('employé → uniquement les clés à true', () => {
    expect(grantedKeys(driver).sort()).toEqual(['tour.capture', 'tour.navigate']);
  });
});

describe('PIN', () => {
  test('profil sans PIN toujours valide', () => {
    expect(verifyPin(driver, '')).toBe(true);
    expect(verifyPin(driver, '9999')).toBe(true);
  });
  test('profil avec PIN', () => {
    const e = { ...driver, pin: '1234' };
    expect(verifyPin(e, '1234')).toBe(true);
    expect(verifyPin(e, '0000')).toBe(false);
  });
  test('normalizePin : 4 chiffres sinon undefined', () => {
    expect(normalizePin('1234')).toBe('1234');
    expect(normalizePin('12a34')).toBe('1234');
    expect(normalizePin('12')).toBeUndefined();
    expect(normalizePin('')).toBeUndefined();
  });
});

describe('defaultAdmin', () => {
  test('crée un administrateur', () => {
    const a = defaultAdmin(1000);
    expect(a.isAdmin).toBe(true);
    expect(a.name).toBe('Administrateur');
    expect(can(a, 'admin.employees')).toBe(true);
  });
});
