import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bridge, Stop, VehicleProfile } from '@/types';

const KEYS = {
  stops: 'tournee.stops',
  vehicle: 'tournee.vehicle',
  customBridges: 'tournee.customBridges',
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
