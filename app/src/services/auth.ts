import { Employee, PermissionKey, RoleTemplate } from '@/types';
import { PERMISSION_CATALOG } from '@/data/permissions';

/**
 * Un employé a accès à une fonction s'il est administrateur, ou si la
 * permission lui a été explicitement accordée.
 */
export function can(employee: Employee | null, key: PermissionKey): boolean {
  if (!employee) return false;
  if (employee.isAdmin) return true;
  return employee.permissions[key] === true;
}

/** Liste des permissions effectivement accordées à un employé. */
export function grantedKeys(employee: Employee): PermissionKey[] {
  if (employee.isAdmin) return PERMISSION_CATALOG.map((p) => p.key);
  return PERMISSION_CATALOG.map((p) => p.key).filter((k) => employee.permissions[k] === true);
}

/** Vérifie le code PIN d'un profil (aucun PIN → toujours valide). */
export function verifyPin(employee: Employee, pin: string): boolean {
  if (!employee.pin) return true;
  return employee.pin === pin;
}

/** Employé administrateur par défaut, créé au premier lancement. */
export function defaultAdmin(now: number): Employee {
  return {
    id: `emp_${now.toString(36)}`,
    name: 'Administrateur',
    isAdmin: true,
    permissions: {},
    createdAt: now,
  };
}

/** Nettoie/valide un PIN saisi (4 chiffres, sinon vide). */
export function normalizePin(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length === 4 ? digits : undefined;
}

/** Construit la map de permissions correspondant à une liste de clés. */
export function permissionsFromKeys(
  keys: PermissionKey[]
): Partial<Record<PermissionKey, boolean>> {
  const map: Partial<Record<PermissionKey, boolean>> = {};
  for (const k of keys) map[k] = true;
  return map;
}

/**
 * Applique un rôle à un employé : remplace ses droits par ceux du rôle.
 * Renvoie un nouvel employé (immutable).
 */
export function applyRole(employee: Employee, role: RoleTemplate): Employee {
  return {
    ...employee,
    roleId: role.id,
    isAdmin: role.isAdmin === true,
    permissions: role.isAdmin ? {} : permissionsFromKeys(role.permissions),
  };
}
