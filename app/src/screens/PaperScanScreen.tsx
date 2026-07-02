import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { scanMaintenanceSheet, ParsedSheet } from '@/services/maintenanceOcr';
import { useFleetStore } from '@/store/useFleetStore';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PaperScan'>;

export default function PaperScanScreen({ route, navigation }: Props) {
  const paramVehicleId = route.params?.vehicleId;
  const vehicles = useFleetStore((s) => s.vehicles);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);

  if (!permission) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Title>Caméra requise</Title>
        <Muted style={{ textAlign: 'center', marginVertical: spacing(2) }}>
          Autorisez la caméra pour lire la fiche d’entretien.
        </Muted>
        <Button title="Autoriser la caméra" onPress={requestPermission} />
      </View>
    );
  }

  // Détermine le véhicule cible : en-tête lu > paramètre > null.
  function resolveVehicleId(p: ParsedSheet): string | null {
    if (p.header && vehicles.some((v) => v.id === p.header!.vehicleId)) {
      return p.header.vehicleId;
    }
    return paramVehicleId ?? null;
  }

  async function capture() {
    if (!cameraRef.current) return;
    try {
      setBusy(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      if (!photo?.base64) throw new Error('Photo indisponible');
      const result = await scanMaintenanceSheet(`data:image/jpeg;base64,${photo.base64}`);
      setParsed(result);
    } catch (e: any) {
      Alert.alert('Erreur de lecture', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function validate() {
    if (!parsed) return;
    const vehicleId = resolveVehicleId(parsed);
    if (!vehicleId) {
      Alert.alert(
        'Véhicule non reconnu',
        'Le code de la fiche n’a pas pu être associé. Ouvrez la fiche depuis un véhicule.'
      );
      return;
    }
    navigation.navigate('InterventionForm', { vehicleId, prefill: parsed });
  }

  const targetVehicle = parsed
    ? vehicles.find((v) => v.id === resolveVehicleId(parsed))
    : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5) }}>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      </View>

      <Button
        title={busy ? 'Lecture en cours…' : '📸 Lire la fiche'}
        onPress={capture}
        loading={busy}
        disabled={busy}
      />

      {parsed && (
        <Card style={{ gap: spacing(1) }}>
          <Title style={{ fontSize: 16 }}>Résultat de la lecture</Title>
          <Row label="Véhicule" value={targetVehicle ? `${targetVehicle.plate}` : parsed.header ? `code ${parsed.header.vehicleId}` : 'non reconnu'} />
          <Row label="Kilométrage" value={parsed.mileageKm != null ? `${parsed.mileageKm} km` : '—'} />
          <Row label="Date" value={parsed.date ?? '—'} />
          <Row label="Mécanicien" value={parsed.mechanic ?? '—'} />
          <Row
            label="Opérations cochées"
            value={
              parsed.operations.filter((o) => o.done).map((o) => o.code).join(', ') || 'aucune'
            }
          />
          {parsed.lowConfidence.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {parsed.lowConfidence.map((f) => (
                <Badge key={f} label={`à vérifier : ${f}`} color={colors.warning} />
              ))}
            </View>
          )}
          <Button title="✅ Vérifier et enregistrer" variant="success" onPress={validate} />
        </Card>
      )}

      <Muted style={{ textAlign: 'center' }}>
        Cadrez toute la fiche, bien à plat. Le code en tête permet l’association automatique
        au véhicule.
      </Muted>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Muted>{label}</Muted>
      <Muted style={{ color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(3) },
  cameraWrap: {
    height: 300,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing(1) },
});
