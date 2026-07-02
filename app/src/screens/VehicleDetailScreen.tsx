import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useFleetStore } from '@/store/useFleetStore';
import { computeDue } from '@/services/maintenanceSchedule';
import { buildSheetHtml, makeFormId, sheetCode } from '@/services/paperForm';
import { qrSvg } from '@/services/qr';
import { todayIso, formatIsoFr } from '@/utils/date';
import { MaintenanceDue } from '@/types';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;

const SEVERITY_COLOR = {
  overdue: colors.danger,
  soon: colors.warning,
  ok: colors.success,
} as const;

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const vehicle = useFleetStore((s) => s.vehicles.find((v) => v.id === vehicleId));
  const interventions = useFleetStore((s) =>
    s.interventions.filter((i) => i.vehicleId === vehicleId)
  );
  const removeVehicle = useFleetStore((s) => s.removeVehicle);

  if (!vehicle) {
    return (
      <View style={styles.center}>
        <Muted>Véhicule introuvable.</Muted>
      </View>
    );
  }

  const due = computeDue(vehicle, interventions, todayIso());

  async function printSheet() {
    if (!vehicle) return;
    try {
      const formId = makeFormId(Date.now());
      const svg = await qrSvg(sheetCode(vehicle.id, formId));
      const html = buildSheetHtml(vehicle, formId, { qrSvg: svg });
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Impression', e.message ?? String(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5) }}>
      <Card>
        <Title>{vehicle.plate}</Title>
        <Muted style={{ marginTop: 4 }}>
          {vehicle.make} {vehicle.model}
          {vehicle.year ? ` · ${vehicle.year}` : ''}
        </Muted>
        <Muted>{vehicle.mileageKm.toLocaleString('fr-FR')} km</Muted>
        {vehicle.pagilogId ? <Muted>PAGILOG #{vehicle.pagilogId}</Muted> : null}
      </Card>

      <View style={{ gap: spacing(1) }}>
        <Button
          title="📝 Nouvelle fiche (sur le téléphone)"
          variant="success"
          onPress={() => navigation.navigate('InterventionForm', { vehicleId })}
        />
        <View style={{ flexDirection: 'row', gap: spacing(1) }}>
          <Button title="🖨️ Imprimer fiche papier" variant="secondary" onPress={printSheet} style={{ flex: 1 }} />
          <Button
            title="📷 Scanner fiche"
            onPress={() => navigation.navigate('PaperScan', { vehicleId })}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Échéances d’entretien</Title>
        {due.map((d) => (
          <DueRow key={d.operation.code} due={d} />
        ))}
      </Card>

      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Historique ({interventions.length})</Title>
        {interventions.length === 0 ? (
          <Muted>Aucune intervention enregistrée.</Muted>
        ) : (
          interventions.map((i) => (
            <View key={i.id} style={styles.histRow}>
              <View style={{ flex: 1 }}>
                <Muted style={{ color: colors.text }}>
                  {formatIsoFr(i.date)} · {i.mileageKm.toLocaleString('fr-FR')} km
                </Muted>
                <Muted>
                  {i.operations.filter((o) => o.done).map((o) => o.label).join(', ') || '—'}
                </Muted>
              </View>
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                {i.source === 'paper-ocr' && <Badge label="OCR papier" color={colors.primary} />}
                <Badge
                  label={i.syncStatus === 'synced' ? 'PAGILOG ✓' : 'à sync.'}
                  color={i.syncStatus === 'synced' ? colors.success : colors.textMuted}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <Button
        title="🗑️ Supprimer le véhicule"
        variant="danger"
        onPress={() =>
          Alert.alert('Supprimer ?', `${vehicle.plate} et son historique`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => {
                removeVehicle(vehicleId);
                navigation.goBack();
              },
            },
          ])
        }
      />
    </ScrollView>
  );
}

function DueRow({ due }: { due: MaintenanceDue }) {
  const parts: string[] = [];
  if (due.kmRemaining !== null) {
    parts.push(due.kmRemaining <= 0 ? `${-due.kmRemaining} km dépassés` : `dans ${due.kmRemaining} km`);
  }
  if (due.daysRemaining !== null) {
    parts.push(due.daysRemaining <= 0 ? `${-due.daysRemaining} j de retard` : `dans ${due.daysRemaining} j`);
  }
  if (parts.length === 0) parts.push('à initialiser');
  return (
    <View style={styles.dueRow}>
      <View style={[styles.dot, { backgroundColor: SEVERITY_COLOR[due.severity] }]} />
      <Muted style={{ color: colors.text, flex: 1 }}>{due.operation.label}</Muted>
      <Muted>{parts.join(' · ')}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  dot: { width: 10, height: 10, borderRadius: 5 },
  histRow: { flexDirection: 'row', gap: spacing(1), alignItems: 'center' },
});
