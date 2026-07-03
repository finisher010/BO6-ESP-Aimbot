import Constants from 'expo-constants';

interface AppExtra {
  nominatimUrl: string;
  osrmUrl: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const config = {
  nominatimUrl: extra.nominatimUrl ?? 'https://nominatim.openstreetmap.org',
  osrmUrl: extra.osrmUrl ?? 'https://router.project-osrm.org',
  // En-tête requis par la politique d'usage de Nominatim.
  userAgent: 'TourneeOptimizer/1.0 (contact: support@tournee.app)',
};
