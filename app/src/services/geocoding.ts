import { Coordinate } from '@/types';
import { config } from './config';

export interface GeocodeResult {
  coordinate: Coordinate;
  displayName: string;
}

/**
 * Géocode une adresse texte → coordonnées via Nominatim (OpenStreetMap).
 * Renvoie null si rien n'est trouvé.
 *
 * Point d'extension : remplacer par Google Geocoding / Mapbox en branchant
 * une clé API ici sans changer le reste de l'app.
 */
export async function geocode(
  query: string,
  near?: Coordinate
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  });
  // Biais de proximité : privilégie les résultats proches de la position courante.
  if (near) {
    const d = 0.4;
    params.set(
      'viewbox',
      `${near.longitude - d},${near.latitude + d},${near.longitude + d},${near.latitude - d}`
    );
  }

  const res = await fetch(`${config.nominatimUrl}/search?${params.toString()}`, {
    headers: { 'User-Agent': config.userAgent, 'Accept-Language': 'fr' },
  });
  if (!res.ok) throw new Error(`Géocodage échoué (${res.status})`);
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  if (!data.length) return null;
  return {
    coordinate: {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    },
    displayName: data[0].display_name,
  };
}
