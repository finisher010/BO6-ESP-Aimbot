import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bridge, Employee, Intervention, Stop, Vehicle, VehicleProfile } from '@/types';
import { PagilogConfig } from './pagilog';

const KEYS = {
  stops: 'tournee.stops',
  vehicle: 'tournee.vehicle',
  customBridges: 'tournee.customBridges',
  fleet: 'fleet.vehicles',
  interventions: 'fleet.interventions',
  pagilog: 'fleet.pagilogConfig',
  employees: 'auth.employees',
  currentEmployee: 'auth.currentEmployee',
};

export async function loadStops(): Promise<Stop[]> {
  const raw = await AsyncStorage.getItem(KEYS.stops);
  return raw ? (JSON.parse(raw) as Stop[]) : [];
}

export async function saveStops(stops: Stop[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.stops, JSON.stringify(stops));
}

export async function loadVehicle(): Promise<VehicleProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.vehicle);
  return raw ? (JSON.parse(raw) as VehicleProfile) : null;
}

export async function saveVehicle(vehicle: VehicleProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.vehicle, JSON.stringify(vehicle));
}

export async function loadCustomBridges(): Promise<Bridge[]> {
  const raw = await AsyncStorage.getItem(KEYS.customBridges);
  return raw ? (JSON.parse(raw) as Bridge[]) : [];
}

export async function saveCustomBridges(bridges: Bridge[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.customBridges, JSON.stringify(bridges));
}

// --- Module Entretien du parc ---------------------------------------------

export async function loadVehicles(): Promise<Vehicle[]> {
  const raw = await AsyncStorage.getItem(KEYS.fleet);
  return raw ? (JSON.parse(raw) as Vehicle[]) : [];
}

export async function saveVehicles(vehicles: Vehicle[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.fleet, JSON.stringify(vehicles));
}

export async function loadInterventions(): Promise<Intervention[]> {
  const raw = await AsyncStorage.getItem(KEYS.interventions);
  return raw ? (JSON.parse(raw) as Intervention[]) : [];
}

export async function saveInterventions(items: Intervention[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.interventions, JSON.stringify(items));
}

export async function loadPagilogConfig(): Promise<PagilogConfig | null> {
  const raw = await AsyncStorage.getItem(KEYS.pagilog);
  return raw ? (JSON.parse(raw) as PagilogConfig) : null;
}

export async function savePagilogConfig(config: PagilogConfig): Promise<void> {
  await AsyncStorage.setItem(KEYS.pagilog, JSON.stringify(config));
}

// --- Employés & droits d'accès --------------------------------------------

export async function loadEmployees(): Promise<Employee[]> {
  const raw = await AsyncStorage.getItem(KEYS.employees);
  return raw ? (JSON.parse(raw) as Employee[]) : [];
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.employees, JSON.stringify(employees));
}

export async function loadCurrentEmployeeId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.currentEmployee);
}

export async function saveCurrentEmployeeId(id: string | null): Promise<void> {
  if (id) await AsyncStorage.setItem(KEYS.currentEmployee, id);
  else await AsyncStorage.removeItem(KEYS.currentEmployee);
}
