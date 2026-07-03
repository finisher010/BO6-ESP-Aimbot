import { extractAddress } from '@/services/ocr';

describe('extractAddress', () => {
  test('choisit la ligne adresse et agrège le code postal/ville', () => {
    const raw = `SOCIÉTÉ DUPONT
12 rue de la Paix
75002 Paris
Tel: 01 23 45 67 89`;
    const res = extractAddress(raw);
    expect(res.addressGuess).toContain('12 rue de la Paix');
    expect(res.addressGuess).toContain('75002 Paris');
    expect(res.lines.length).toBe(4);
  });

  test('gère une adresse anglaise', () => {
    const raw = `John Smith
221B Baker Street
London NW1 6XE`;
    const res = extractAddress(raw);
    expect(res.addressGuess.toLowerCase()).toContain('baker street');
  });

  test('texte sans adresse → renvoie la première ligne', () => {
    const res = extractAddress('Bonjour\nMerci');
    expect(res.addressGuess).toBe('Bonjour');
  });

  test('texte vide → adresse vide', () => {
    const res = extractAddress('');
    expect(res.addressGuess).toBe('');
    expect(res.lines).toHaveLength(0);
  });
});
