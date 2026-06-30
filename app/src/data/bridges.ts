import { Bridge } from '@/types';

/**
 * Base locale de ponts à hauteur limitée.
 *
 * Cette liste est embarquée pour fonctionner hors-ligne. Elle est volontairement
 * petite (exemples réels notoires) et destinée à être enrichie :
 *  - import d'un export OpenStreetMap (clés `maxheight`),
 *  - téléchargement d'un fichier opérateur de flotte,
 *  - ajout manuel par le chauffeur (voir `addCustomBridge`).
 *
 * Format hauteur : mètres (hauteur libre maximale sous l'ouvrage).
 */
export const KNOWN_BRIDGES: Bridge[] = [
  {
    id: 'fr-paris-pont-amont',
    name: 'Pont bas — exemple Paris (quai)',
    coordinate: { latitude: 48.8312, longitude: 2.387 },
    maxHeightM: 3.1,
    source: 'exemple',
  },
  {
    id: 'fr-lyon-tunnel',
    name: 'Passage bas — exemple Lyon',
    coordinate: { latitude: 45.7589, longitude: 4.8412 },
    maxHeightM: 3.5,
    source: 'exemple',
  },
  {
    id: 'uk-stonehouse-bridge',
    name: 'Stonehouse railway bridge (exemple)',
    coordinate: { latitude: 51.7456, longitude: -2.2789 },
    maxHeightM: 3.0,
    source: 'exemple',
  },
  {
    id: 'us-11foot8',
    name: '11foot8+8 Bridge (exemple, Durham NC)',
    coordinate: { latitude: 35.9989, longitude: -78.9103 },
    maxHeightM: 3.86,
    source: 'exemple',
  },
];
