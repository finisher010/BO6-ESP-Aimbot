import { create } from 'zustand';
import { Employee, PermissionKey } from '@/types';
import * as storage from '@/services/storage';
import { can, defaultAdmin } from '@/services/auth';

let counter = 0;
function makeId(): string {
  counter += 1;
  return `emp_${Date.now().toString(36)}_${counter}`;
}

interface AuthState {
  employees: Employee[];
  currentEmployeeId: string | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  current: () => Employee | null;
  can: (key: PermissionKey) => boolean;

  addEmployee: (name: string, isAdmin: boolean) => Employee;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  setPermission: (id: string, key: PermissionKey, value: boolean) => void;
  removeEmployee: (id: string) => void;

  login: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  employees: [],
  currentEmployeeId: null,
  hydrated: false,

  hydrate: async () => {
    let [employees, currentEmployeeId] = await Promise.all([
      storage.loadEmployees(),
      storage.loadCurrentEmployeeId(),
    ]);
    // Premier lancement : on crée un administrateur par défaut.
    if (employees.length === 0) {
      const admin = defaultAdmin(Date.now());
      employees = [admin];
      currentEmployeeId = admin.id;
      await storage.saveEmployees(employees);
      await storage.saveCurrentEmployeeId(currentEmployeeId);
    }
    // Profil courant invalide → aucun (l'app demandera de choisir).
    if (currentEmployeeId && !employees.some((e) => e.id === currentEmployeeId)) {
      currentEmployeeId = null;
    }
    set({ employees, currentEmployeeId, hydrated: true });
  },

  current: () => {
    const { employees, currentEmployeeId } = get();
    return employees.find((e) => e.id === currentEmployeeId) ?? null;
  },

  can: (key) => can(get().current(), key),

  addEmployee: (name, isAdmin) => {
    const emp: Employee = {
      id: makeId(),
      name: name.trim() || 'Employé',
      isAdmin,
      permissions: {},
      createdAt: Date.now(),
    };
    const employees = [...get().employees, emp];
    set({ employees });
    storage.saveEmployees(employees);
    return emp;
  },

  updateEmployee: (id, patch) => {
    const employees = get().employees.map((e) => (e.id === id ? { ...e, ...patch } : e));
    set({ employees });
    storage.saveEmployees(employees);
  },

  setPermission: (id, key, value) => {
    const employees = get().employees.map((e) =>
      e.id === id ? { ...e, permissions: { ...e.permissions, [key]: value } } : e
    );
    set({ employees });
    storage.saveEmployees(employees);
  },

  removeEmployee: (id) => {
    const employees = get().employees.filter((e) => e.id !== id);
    const currentEmployeeId = get().currentEmployeeId === id ? null : get().currentEmployeeId;
    set({ employees, currentEmployeeId });
    storage.saveEmployees(employees);
    storage.saveCurrentEmployeeId(currentEmployeeId);
  },

  login: (id) => {
    set({ currentEmployeeId: id });
    storage.saveCurrentEmployeeId(id);
  },

  logout: () => {
    set({ currentEmployeeId: null });
    storage.saveCurrentEmployeeId(null);
  },
}));
