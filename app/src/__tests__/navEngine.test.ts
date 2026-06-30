import { computeNavState, announcePhrase } from '@/services/navEngine';
import { Bridge, NavStep } from '@/types';

const steps: NavStep[] = [
  {
    instruction: 'Tournez à droite sur Rue A',
    coordinate: { latitude: 48.8500, longitude: 2.3500 },
    distanceM: 100,
    maneuver: 'turn',
    modifier: 'right',
  },
  {
    instruction: 'Tournez à gauche sur Rue B',
    coordinate: { latitude: 48.8520, longitude: 2.3520 },
    distanceM: 200,
    maneuver: 'turn',
    modifier: 'left',
  },
  {
    instruction: 'Vous êtes arrivé à destination',
    coordinate: { latitude: 48.8540, longitude: 2.3540 },
    distanceM: 0,
    maneuver: 'arrive',
  },
];

describe('computeNavState', () => {
  test('au point de manœuvre, avance à l’étape suivante', () => {
    // Très proche de l'étape 0 → doit passer à l'étape 1.
    const state = computeNavState(steps[0].coordinate, steps, 0, []);
    expect(state.stepIndex).toBe(1);
    expect(state.currentInstruction).toContain('Rue B');
    expect(state.nextInstruction).toContain('arrivé');
  });

  test('loin de la manœuvre, garde l’étape courante', () => {
    const far = { latitude: 48.8400, longitude: 2.3400 };
    const state = computeNavState(far, steps, 0, []);
    expect(state.stepIndex).toBe(0);
    expect(state.distanceToStepM).toBeGreaterThan(100);
  });

  test('détecte un pont bas dans le rayon d’alerte', () => {
    const bridge: Bridge = {
      id: 'b1',
      name: 'Pont',
      coordinate: { latitude: 48.8401, longitude: 2.3401 },
      maxHeightM: 2.8,
    };
    const pos = { latitude: 48.8400, longitude: 2.3400 };
    const state = computeNavState(pos, steps, 0, [bridge]);
    expect(state.bridgeAhead).not.toBeNull();
    expect(state.bridgeAhead?.bridge.id).toBe('b1');
  });

  test('aucun pont si hors rayon', () => {
    const bridge: Bridge = {
      id: 'b2',
      name: 'Pont loin',
      coordinate: { latitude: 49.0, longitude: 3.0 },
      maxHeightM: 2.8,
    };
    const pos = { latitude: 48.8400, longitude: 2.3400 };
    expect(computeNavState(pos, steps, 0, [bridge]).bridgeAhead).toBeNull();
  });
});

describe('announcePhrase', () => {
  test('annonce anticipée avec distance arrondie', () => {
    const far = { latitude: 48.8400, longitude: 2.3400 };
    const state = computeNavState(far, steps, 0, []);
    const phrase = announcePhrase(state);
    expect(phrase).toMatch(/Dans \d+ mètres/);
  });
});
