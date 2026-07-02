import QRCode from 'qrcode';

/**
 * Génère un QR code au format SVG (chaîne) pour l'impression de la fiche.
 * Le contenu est le code fiche `FE:<véhicule>:<fiche>`, ce qui permet une
 * association 100 % fiable au scan, sans dépendre de l'OCR.
 */
export async function qrSvg(content: string): Promise<string> {
  return QRCode.toString(content, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
