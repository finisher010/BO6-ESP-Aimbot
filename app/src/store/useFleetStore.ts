import { create } from 'zustand';
import { Intervention, Vehicle } from '@/types';
import * as storage from '@/services/storage';
import { EMPTY_CONFIG, PagilogConfig } from '@/services/pagilog';

let counter = 0;
function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

interface FleetState {
  vehicles: Vehicle[];
  interventions: Intervention[];
  pagilog: PagilogConfig;
  hydrated: boolean;

  hydrate: () => Promise<void>;

  addVehicle: (v: Omit<Vehicle, 'id' | 'createdAt'>) => Vehicle;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  setVehicles: (vehicles: Vehicle[]) => void;

  addIntervention: (i: Omit<Intervention, 'id' | 'createdAt'>) => Intervention;
  updateIntervention: (id: string, patch: Partial<Intervention>) => void;
  removeIntervention: (id: string) => void;
  markSynced: (ids: string[]) => void;

  setPagilog: (config: PagilogConfig) => void;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  vehicles: [],
  interventions: [],
  pagilog: EMPTY_CONFIG,
  hydrated: false,

  hydrate: async () => {
    const [vehicles, interventions, pagilog] = await Promise.all([
      storage.loadVehicles(),
      storage.loadInterventions(),
      storage.loadPagilogConfig(),
    ]);
    set({ vehicles, interventions, pagilog: pagilog ?? EMPTY_CONFIG, hydrated: true });
  },

  addVehicle: (v) => {
    const vehicle: Vehicle = { ...v, id: makeId('veh'), createdAt: Date.now() };
    const vehicles = [...get().vehicles, vehicle];
    set({ vehicles });
    storage.saveVehicles(vehicles);
    return vehicle;
  },

  updateVehicle: (id, patch) => {
    const vehicles = get().vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v));
    set({ vehicles });
    storage.saveVehicles(vehicles);
  },

  removeVehicle: (id) => {
    const vehicles = get().vehicles.filter((v) => v.id !== id);
    const interventions = get().interventions.filter((i) => i.vehicleId !== id);
    set({ vehicles, interventions });
    storage.saveVehicles(vehicles);
    storage.saveInterventions(interventions);
  },

  setVehicles: (vehicles) => {
    set({ vehicles });
    storage.saveVehicles(vehicles);
  },

  addIntervention: (i) => {
    const item: Intervention = { ...i, id: makeId('int'), createdAt: Date.now() };
    const interventions = [item, ...get().interventions];
    set({ interventions });
    storage.saveInterventions(interventions);
    // Met à jour le kilométrage courant du véhicule si plus récent.
    const veh = get().vehicles.find((v) => v.id === item.vehicleId);
    if (veh && item.mileageKm > veh.mileageKm) {
      get().updateVehicle(veh.id, { mileageKm: item.mileageKm });
    }
    return item;
  },

  updateIntervention: (id, patch) => {
    const interventions = get().interventions.map((i) =>
      i.id === id ? { ...i, ...patch } : i
    );
    set({ interventions });
    storage.saveInterventions(interventions);
  },

  removeIntervention: (id) => {
    const interventions = get().interventions.filter((i) => i.id !== id);
    set({ interventions });
    storage.saveInterventions(interventions);
  },

  markSynced: (ids) => {
    const set2 = new Set(ids);
    const interventions = get().interventions.map((i) =>
      set2.has(i.id) ? { ...i, syncStatus: 'synced' as const } : i
    );
    set({ interventions });
    storage.saveInterventions(interventions);
  },

  setPagilog: (pagilog) => {
    set({ pagilog });
    storage.savePagilogConfig(pagilog);
  },
}));
