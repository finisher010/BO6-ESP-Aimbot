import { create } from 'zustand';
import {
  Bridge,
  Coordinate,
  OptimizedRoute,
  Stop,
  VehicleProfile,
} from '@/types';
import * as storage from '@/services/storage';
import { setCustomBridges } from '@/services/bridges';

const DEFAULT_VEHICLE: VehicleProfile = {
  heightM: 3.0,
  weightT: 3.5,
  clearanceMarginM: 0.2,
};

let counter = 0;
function makeId(): string {
  counter += 1;
  return `s_${Date.now().toString(36)}_${counter}`;
}

interface TourState {
  stops: Stop[];
  vehicle: VehicleProfile;
  customBridges: Bridge[];
  route: OptimizedRoute | null;
  currentPosition: Coordinate | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  addStop: (label: string, coordinate?: Coordinate, resolved?: string) => Stop;
  updateStop: (id: string, patch: Partial<Stop>) => void;
  removeStop: (id: string) => void;
  reorderStops: (orderedIds: string[]) => void;
  clearStops: () => void;
  setStatus: (id: string, status: Stop['status']) => void;

  setVehicle: (vehicle: VehicleProfile) => void;
  addCustomBridge: (bridge: Omit<Bridge, 'id'>) => void;
  removeCustomBridge: (id: string) => void;

  setRoute: (route: OptimizedRoute | null) => void;
  setCurrentPosition: (c: Coordinate | null) => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  stops: [],
  vehicle: DEFAULT_VEHICLE,
  customBridges: [],
  route: null,
  currentPosition: null,
  hydrated: false,

  hydrate: async () => {
    const [stops, vehicle, customBridges] = await Promise.all([
      storage.loadStops(),
      storage.loadVehicle(),
      storage.loadCustomBridges(),
    ]);
    setCustomBridges(customBridges);
    set({
      stops,
      vehicle: vehicle ?? DEFAULT_VEHICLE,
      customBridges,
      hydrated: true,
    });
  },

  addStop: (label, coordinate, resolved) => {
    const stop: Stop = {
      id: makeId(),
      label,
      coordinate,
      resolvedAddress: resolved,
      status: 'pending',
      createdAt: Date.now(),
    };
    const stops = [...get().stops, stop];
    set({ stops, route: null });
    storage.saveStops(stops);
    return stop;
  },

  updateStop: (id, patch) => {
    const stops = get().stops.map((s) => (s.id === id ? { ...s, ...patch } : s));
    set({ stops });
    storage.saveStops(stops);
  },

  removeStop: (id) => {
    const stops = get().stops.filter((s) => s.id !== id);
    set({ stops, route: null });
    storage.saveStops(stops);
  },

  reorderStops: (orderedIds) => {
    const map = new Map(get().stops.map((s) => [s.id, s]));
    const stops = orderedIds
      .map((id, i) => {
        const s = map.get(id);
        return s ? { ...s, order: i } : null;
      })
      .filter((s): s is Stop => s !== null);
    set({ stops });
    storage.saveStops(stops);
  },

  clearStops: () => {
    set({ stops: [], route: null });
    storage.saveStops([]);
  },

  setStatus: (id, status) => {
    get().updateStop(id, { status });
  },

  setVehicle: (vehicle) => {
    set({ vehicle, route: null });
    storage.saveVehicle(vehicle);
  },

  addCustomBridge: (bridge) => {
    const next = [...get().customBridges, { ...bridge, id: makeId() }];
    setCustomBridges(next);
    set({ customBridges: next, route: null });
    storage.saveCustomBridges(next);
  },

  removeCustomBridge: (id) => {
    const next = get().customBridges.filter((b) => b.id !== id);
    setCustomBridges(next);
    set({ customBridges: next, route: null });
    storage.saveCustomBridges(next);
  },

  setRoute: (route) => set({ route }),
  setCurrentPosition: (currentPosition) => set({ currentPosition }),
}));
