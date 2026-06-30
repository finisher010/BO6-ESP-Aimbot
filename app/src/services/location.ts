import * as Location from 'expo-location';
import { Coordinate } from '@/types';

export interface LivePosition extends Coordinate {
  /** Cap en degrés, si disponible. */
  heading: number | null;
  /** Vitesse en m/s, si disponible. */
  speed: number | null;
  /** Précision horizontale estimée en mètres. */
  accuracy: number | null;
  timestamp: number;
}

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition(): Promise<Coordinate | null> {
  const ok = await requestPermissions();
  if (!ok) return null;
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

/**
 * Suivi GPS haute précision pendant la conduite.
 * - Accuracy.BestForNavigation : meilleure précision possible.
 * - distanceInterval bas + timeInterval court → flux fluide pour le guidage.
 * Renvoie une fonction d'arrêt.
 */
export async function watchPosition(
  onUpdate: (pos: LivePosition) => void
): Promise<() => void> {
  const ok = await requestPermissions();
  if (!ok) throw new Error('Permission de localisation refusée');

  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5,
      timeInterval: 1000,
    },
    (pos) => {
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        accuracy: pos.coords.accuracy ?? null,
        timestamp: pos.timestamp,
      });
    }
  );
  return () => sub.remove();
}
