import { parseHeader, parseDate, parseMaintenanceSheet } from '@/services/maintenanceOcr';

describe('parseHeader', () => {
  test('lit le code machine', () => {
    expect(parseHeader('FE:v1:F1A')).toEqual({ vehicleId: 'v1', formId: 'F1A' });
  });
  test('tolère les espaces OCR', () => {
    expect(parseHeader('F E : v1 : F1A')).toEqual({ vehicleId: 'v1', formId: 'F1A' });
  });
  test('renvoie null si absent', () => {
    expect(parseHeader('rien ici')).toBeNull();
  });
});

describe('parseDate', () => {
  test('JJ/MM/AAAA', () => {
    expect(parseDate('02/07/2026')).toBe('2026-07-02');
  });
  test('année sur 2 chiffres', () => {
    expect(parseDate('2-7-26')).toBe('2026-07-02');
  });
  test('date invalide', () => {
    expect(parseDate('99/99/9999')).toBeNull();
  });
});

describe('parseMaintenanceSheet', () => {
  const filled = [
    "PARC VEHICULES - FICHE D'ENTRETIEN",
    'FE:v1:F1A',
    'Vehicule: Renault Master  Immat: AB-123-CD',
    'KM> 152340',
    'DATE> 02/07/2026',
    'MECA> Jean Dupont',
    '[X] VIDANGE  Vidange moteur',
    '[ ] FREINS_AV Plaquettes avant',
    '[x] PNEUS Controle pneus',
    'PIECES> FILT-123 x 2',
    'HEURES> 1,5   COUT> 245,90',
    'NOTES> RAS niveau ok',
  ].join('\n');

  const p = parseMaintenanceSheet(filled);

  test('en-tête et champs simples', () => {
    expect(p.header).toEqual({ vehicleId: 'v1', formId: 'F1A' });
    expect(p.mileageKm).toBe(152340);
    expect(p.date).toBe('2026-07-02');
    expect(p.mechanic).toBe('Jean Dupont');
  });

  test('cases cochées détectées', () => {
    expect(p.operations.find((o) => o.code === 'VIDANGE')?.done).toBe(true);
    expect(p.operations.find((o) => o.code === 'FREINS_AV')?.done).toBe(false);
    expect(p.operations.find((o) => o.code === 'PNEUS')?.done).toBe(true);
  });

  test('heures et coût séparés malgré la ligne partagée', () => {
    expect(p.laborHours).toBe(1.5);
    expect(p.costEuros).toBe(245.9);
  });

  test('pièces et notes', () => {
    expect(p.parts[0]).toMatchObject({ reference: 'FILT-123', qty: 2 });
    expect(p.notes).toBe('RAS niveau ok');
  });

  test('aucun champ douteux sur une fiche propre', () => {
    expect(p.lowConfidence).toHaveLength(0);
  });

  test('champs manquants signalés en faible confiance', () => {
    const bad = parseMaintenanceSheet('juste du texte sans repères');
    expect(bad.lowConfidence).toEqual(expect.arrayContaining(['code fiche', 'kilométrage', 'date']));
  });
});
