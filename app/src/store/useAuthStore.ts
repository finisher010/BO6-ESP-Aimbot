import { create } from 'zustand';
import { Employee, PermissionKey } from '@/types';
import * as storage from '@/services/storage';
import { applyRole, can, defaultAdmin } from '@/services/auth';
import { roleById } from '@/data/roles';
import { useFleetStore } from '@/store/useFleetStore';
import {
  DirectoryStatus,
  LiveSyncHandle,
  startDirectorySync,
} from '@/services/directorySync';

let counter = 0;
function makeId(): string {
  counter += 1;
  return `emp_${Date.now().toString(36)}_${counter}`;
}

// Handle de la synchro temps réel (hors state : non sérialisable).
let liveHandle: LiveSyncHandle | null = null;

interface AuthState {
  employees: Employee[];
  currentEmployeeId: string | null;
  hydrated: boolean;
  directoryStatus: DirectoryStatus;
  directoryError?: string;
  lastSyncAt?: number;

  hydrate: () => Promise<void>;
  current: () => Employee | null;
  can: (key: PermissionKey) => boolean;

  addEmployee: (name: string, isAdmin: boolean) => Employee;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  setPermission: (id: string, key: PermissionKey, value: boolean) => void;
  applyRoleTo: (id: string, roleId: string) => void;
  removeEmployee: (id: string) => void;

  login: (id: string) => void;
  logout: () => void;

  // Synchronisation centralisée PAGILOG (temps réel)
  mergeRemoteEmployees: (remote: Employee[]) => void;
  startLiveSync: () => void;
  stopLiveSync: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  employees: [],
  currentEmployeeId: null,
  hydrated: false,
  directoryStatus: 'off',

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
      e.id === id ? { ...e, permissions: { ...e.permissions, [key]: value }, roleId: undefined } : e
    );
    set({ employees });
    storage.saveEmployees(employees);
  },

  applyRoleTo: (id, roleId) => {
    const role = roleById(roleId);
    if (!role) return;
    const employees = get().employees.map((e) => (e.id === id ? applyRole(e, role) : e));
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

  mergeRemoteEmployees: (remote) => {
    // On conserve les profils locaux (non gérés) et on remplace l'ensemble
    // des profils gérés par ceux reçus de PAGILOG.
    const local = get().employees.filter((e) => !e.managed);
    const employees = [...local, ...remote];
    let currentEmployeeId = get().currentEmployeeId;
    if (currentEmployeeId && !employees.some((e) => e.id === currentEmployeeId)) {
      currentEmployeeId = null; // profil courant retiré côté PAGILOG
    }
    set({ employees, currentEmployeeId, lastSyncAt: Date.now() });
    storage.saveEmployees(employees);
    storage.saveCurrentEmployeeId(currentEmployeeId);
  },

  startLiveSync: () => {
    const config = useFleetStore.getState().pagilog;
    liveHandle?.stop();
    liveHandle = null;
    if (!config.directorySync || (!config.wsUrl && !config.baseUrl)) {
      set({ directoryStatus: 'off', directoryError: undefined });
      return;
    }
    liveHandle = startDirectorySync(
      config,
      (employees) => get().mergeRemoteEmployees(employees),
      (status, error) => set({ directoryStatus: status, directoryError: error })
    );
  },

  stopLiveSync: () => {
    liveHandle?.stop();
    liveHandle = null;
    set({ directoryStatus: 'off', directoryError: undefined });
  },
}));
