import { detectBridgeConflicts, requiredClearance } from '@/services/bridges';
import { Bridge, RouteLeg, VehicleProfile } from '@/types';

const vehicle: VehicleProfile = { heightM: 3.5, weightT: 7, clearanceMarginM: 0.2 };

// Un tronçon qui passe juste à côté d'un pont.
const bridgeCoord = { latitude: 48.8312, longitude: 2.387 };
const legThroughBridge: RouteLeg = {
  fromId: 'a',
  toId: 'b',
  distanceM: 100,
  durationS: 20,
  geometry: [
    { latitude: 48.8310, longitude: 2.3868 },
    bridgeCoord,
    { latitude: 48.8314, longitude: 2.3872 },
  ],
};

describe('ponts', () => {
  test('hauteur requise = hauteur + marge', () => {
    expect(requiredClearance(vehicle)).toBeCloseTo(3.7, 5);
  });

  test('signale un pont trop bas sur le trajet', () => {
    const lowBridge: Bridge = {
      id: 'low',
      name: 'Pont test',
      coordinate: bridgeCoord,
      maxHeightM: 3.1,
    };
    const warnings = detectBridgeConflicts([legThroughBridge], vehicle, [lowBridge]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].bridge.id).toBe('low');
  });

  test('ignore un pont assez haut', () => {
    const highBridge: Bridge = {
      id: 'high',
      name: 'Pont haut',
      coordinate: bridgeCoord,
      maxHeightM: 4.5,
    };
    expect(detectBridgeConflicts([legThroughBridge], vehicle, [highBridge])).toHaveLength(0);
  });

  test('ignore un pont bas mais éloigné du tracé', () => {
    const farBridge: Bridge = {
      id: 'far',
      name: 'Pont loin',
      coordinate: { latitude: 48.9, longitude: 2.5 },
      maxHeightM: 2.5,
    };
    expect(detectBridgeConflicts([legThroughBridge], vehicle, [farBridge])).toHaveLength(0);
  });
});
