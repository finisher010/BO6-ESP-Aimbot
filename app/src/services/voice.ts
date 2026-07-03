import * as Speech from 'expo-speech';

let enabled = true;
let lastSpoken = '';

export function setVoiceEnabled(value: boolean): void {
  enabled = value;
  if (!value) Speech.stop();
}

export function isVoiceEnabled(): boolean {
  return enabled;
}

/**
 * Énonce une consigne. Anti-répétition : ne redit pas deux fois de suite
 * exactement la même phrase (utile quand on rafraîchit l'étape en boucle).
 */
export function speak(text: string, force = false): void {
  if (!enabled) return;
  if (!force && text === lastSpoken) return;
  lastSpoken = text;
  Speech.speak(text, {
    language: 'fr-FR',
    pitch: 1.0,
    rate: 1.0,
  });
}

/** Alerte prioritaire (pont bas, recalcul) : interrompt et répète. */
export function speakAlert(text: string): void {
  if (!enabled) return;
  lastSpoken = '';
  Speech.stop();
  Speech.speak(text, { language: 'fr-FR', pitch: 1.1, rate: 0.95 });
}

export function stopSpeaking(): void {
  Speech.stop();
}
