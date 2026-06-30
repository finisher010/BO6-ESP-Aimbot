/**
 * OCR d'adresse à partir d'une photo.
 *
 * Stratégie par défaut : OCR.space (API HTTP, aucun module natif requis →
 * fonctionne dans Expo Go). Remplacez `OCR_SPACE_API_KEY` par votre clé
 * gratuite (https://ocr.space/ocrapi). La clé de démo 'helloworld' est
 * limitée mais permet de tester immédiatement.
 *
 * Point d'extension : pour de l'OCR 100 % hors-ligne et plus précis, brancher
 * un dev build avec ML Kit (vision-camera-ocr) et implémenter `recognizeText`.
 */

const OCR_SPACE_API_KEY = 'helloworld';
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

export interface OcrResult {
  rawText: string;
  /** Meilleure ligne candidate pour une adresse postale. */
  addressGuess: string;
  /** Toutes les lignes non vides, pour choix manuel. */
  lines: string[];
}

/** Envoie une image base64 (data URI) à OCR.space et renvoie le texte. */
export async function recognizeText(base64DataUri: string): Promise<string> {
  const body = new FormData();
  body.append('base64Image', base64DataUri);
  body.append('language', 'fre');
  body.append('OCREngine', '2');
  body.append('scale', 'true');

  const res = await fetch(OCR_SPACE_URL, {
    method: 'POST',
    headers: { apikey: OCR_SPACE_API_KEY },
    body,
  });
  if (!res.ok) throw new Error(`OCR échoué (${res.status})`);
  const data = (await res.json()) as any;
  if (data.IsErroredOnProcessing) {
    throw new Error(
      Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join(' ')
        : String(data.ErrorMessage)
    );
  }
  return data.ParsedResults?.[0]?.ParsedText ?? '';
}

const STREET_KEYWORDS =
  /\b(rue|avenue|av|bd|boulevard|all[ée]e|impasse|chemin|route|rte|place|quai|cours|chauss[ée]e|street|st|road|rd|drive|dr|lane|ln|way)\b/i;

/**
 * Heuristique : sélectionne la ligne qui ressemble le plus à une adresse.
 * Score = présence d'un numéro + mot-clé de voie + éventuel code postal.
 */
export function extractAddress(rawText: string): OcrResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  let best = '';
  let bestScore = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let score = 0;
    if (/\d/.test(line)) score += 1;
    if (/^\s*\d+/.test(line)) score += 1; // commence par un numéro de voie
    if (STREET_KEYWORDS.test(line)) score += 2;
    if (/\b\d{4,5}\b/.test(line)) score += 1; // code postal
    if (line.length >= 8 && line.length <= 60) score += 1;
    // Bonus si la ligne suivante ressemble à "CP Ville" → on les agrège.
    const next = lines[i + 1];
    const merged =
      next && /\b\d{4,5}\b/.test(next) && STREET_KEYWORDS.test(line)
        ? `${line}, ${next}`
        : line;
    if (score > bestScore) {
      bestScore = score;
      best = merged;
    }
  }

  return {
    rawText,
    addressGuess: best || lines[0] || '',
    lines,
  };
}

/** Pipeline complet : image → texte → adresse candidate. */
export async function scanAddress(base64DataUri: string): Promise<OcrResult> {
  const text = await recognizeText(base64DataUri);
  return extractAddress(text);
}
