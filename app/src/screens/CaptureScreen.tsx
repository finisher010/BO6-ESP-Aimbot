import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Button, Card, Muted, Title } from '@/components/ui';
import { scanAddress } from '@/services/ocr';
import { geocode } from '@/services/geocoding';
import { getCurrentPosition } from '@/services/location';
import { useTourStore } from '@/store/useTourStore';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export default function CaptureScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const addStop = useTourStore((s) => s.addStop);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [candidate, setCandidate] = useState('');
  const [lines, setLines] = useState<string[]>([]);

  if (!permission) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Title>Caméra requise</Title>
        <Muted style={{ textAlign: 'center', marginVertical: spacing(2) }}>
          Autorisez la caméra pour photographier et lire les adresses.
        </Muted>
        <Button title="Autoriser la caméra" onPress={requestPermission} />
      </View>
    );
  }

  async function capture() {
    if (!cameraRef.current) return;
    try {
      setBusy(true);
      setBusyLabel('Lecture du texte…');
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: false,
      });
      if (!photo?.base64) throw new Error('Photo indisponible');
      const result = await scanAddress(`data:image/jpeg;base64,${photo.base64}`);
      setCandidate(result.addressGuess);
      setLines(result.lines);
      if (!result.addressGuess) {
        Alert.alert('Aucune adresse détectée', 'Réessayez en cadrant mieux l’étiquette.');
      }
    } catch (e: any) {
      Alert.alert('Erreur OCR', e.message ?? String(e));
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  }

  async function confirmAddress() {
    const text = candidate.trim();
    if (!text) return;
    try {
      setBusy(true);
      setBusyLabel('Géocodage de l’adresse…');
      const near = (await getCurrentPosition()) ?? undefined;
      const geo = await geocode(text, near);
      if (!geo) {
        Alert.alert(
          'Adresse introuvable',
          'L’arrêt est enregistré sans coordonnées. Vous pourrez le corriger dans « Mes arrêts ».'
        );
        addStop(text);
      } else {
        addStop(text, geo.coordinate, geo.displayName);
      }
      setCandidate('');
      setLines([]);
      navigation.navigate('Stops');
    } catch (e: any) {
      Alert.alert('Erreur de géocodage', e.message ?? String(e));
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View style={styles.reticle} pointerEvents="none" />
      </View>

      <Button
        title={busy ? busyLabel || 'Patientez…' : '📸 Capturer l’adresse'}
        onPress={capture}
        loading={busy && !candidate}
        disabled={busy}
      />

      {candidate.length > 0 && (
        <Card style={{ gap: spacing(1) }}>
          <Title style={{ fontSize: 16 }}>Adresse détectée</Title>
          <TextInput
            value={candidate}
            onChangeText={setCandidate}
            style={styles.input}
            placeholder="Adresse"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          {lines.length > 1 && (
            <>
              <Muted>Autres lignes lues (toucher pour utiliser) :</Muted>
              <View style={{ gap: 6 }}>
                {lines.map((l, i) => (
                  <TouchableOpacity key={i} onPress={() => setCandidate(l)}>
                    <Text style={styles.lineChip}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <Button
            title="✅ Valider et géocoder"
            variant="success"
            onPress={confirmAddress}
            loading={busy}
          />
        </Card>
      )}

      <Muted style={{ textAlign: 'center' }}>
        Astuce : cadrez l’étiquette ou la plaque de rue bien à plat, sans reflet.
      </Muted>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(2), gap: spacing(1.5) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(3) },
  cameraWrap: {
    height: 320,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  camera: { flex: 1 },
  reticle: {
    position: 'absolute',
    top: '30%',
    left: '8%',
    right: '8%',
    height: '40%',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderStyle: 'dashed',
  },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing(1.5),
    fontSize: 16,
    minHeight: 48,
  },
  lineChip: {
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
});
