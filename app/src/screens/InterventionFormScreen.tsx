import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useFleetStore } from '@/store/useFleetStore';
import { OPERATION_CATALOG } from '@/data/maintenancePlans';
import { todayIso } from '@/utils/date';
import { InterventionOperation } from '@/types';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InterventionForm'>;

export default function InterventionFormScreen({ route, navigation }: Props) {
  const { vehicleId, prefill } = route.params;
  const vehicle = useFleetStore((s) => s.vehicles.find((v) => v.id === vehicleId));
  const addIntervention = useFleetStore((s) => s.addIntervention);

  const fromOcr = !!prefill;

  const [date, setDate] = useState(prefill?.date ?? todayIso());
  const [mileage, setMileage] = useState(
    prefill?.mileageKm != null ? String(prefill.mileageKm) : vehicle ? String(vehicle.mileageKm) : ''
  );
  const [mechanic, setMechanic] = useState(prefill?.mechanic ?? '');
  const [hours, setHours] = useState(prefill?.laborHours != null ? String(prefill.laborHours) : '');
  const [cost, setCost] = useState(prefill?.costEuros != null ? String(prefill.costEuros) : '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');

  // État coché de chaque opération, initialisé depuis l'OCR si présent.
  const initialChecked = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const op of OPERATION_CATALOG) {
      const parsed = prefill?.operations.find((o) => o.code === op.code);
      map[op.code] = parsed?.done ?? false;
    }
    return map;
  }, [prefill]);
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked);

  function toggle(code: string) {
    setChecked((c) => ({ ...c, [code]: !c[code] }));
  }

  function save() {
    const km = parseInt(mileage, 10);
    if (!isFinite(km)) {
      Alert.alert('Kilométrage requis', 'Saisissez le kilométrage relevé.');
      return;
    }
    const operations: InterventionOperation[] = OPERATION_CATALOG.filter(
      (op) => checked[op.code]
    ).map((op) => ({ code: op.code, label: op.label, done: true }));

    if (operations.length === 0) {
      Alert.alert('Aucune opération', 'Cochez au moins une opération réalisée.');
      return;
    }

    addIntervention({
      vehicleId,
      date,
      mileageKm: km,
      operations,
      parts: prefill?.parts ?? [],
      laborHours: hours ? parseFloat(hours.replace(',', '.')) : undefined,
      costEuros: cost ? parseFloat(cost.replace(',', '.')) : undefined,
      mechanic: mechanic || undefined,
      notes: notes || undefined,
      source: fromOcr ? 'paper-ocr' : 'app',
      syncStatus: 'local',
      ocrRawText: undefined,
    });
    Alert.alert('Enregistré', 'Fiche ajoutée à l’historique du véhicule.');
    navigation.navigate('VehicleDetail', { vehicleId });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5) }}>
      {fromOcr && (
        <Card style={{ borderColor: colors.primary, gap: 4 }}>
          <Title style={{ fontSize: 15, color: colors.primary }}>Lecture automatique</Title>
          <Muted>Champs pré-remplis depuis la fiche scannée. Vérifiez avant d’enregistrer.</Muted>
          {prefill?.lowConfidence.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {prefill.lowConfidence.map((f) => (
                <Badge key={f} label={`à vérifier : ${f}`} color={colors.warning} />
              ))}
            </View>
          ) : null}
        </Card>
      )}

      <Card style={{ gap: spacing(1) }}>
        <Muted>Véhicule : {vehicle ? `${vehicle.plate} — ${vehicle.make} ${vehicle.model}` : vehicleId}</Muted>
        <Field label="Date (AAAA-MM-JJ)" value={date} onChange={setDate} />
        <Field label="Kilométrage" value={mileage} onChange={setMileage} keyboard="number-pad" />
        <Field label="Mécanicien" value={mechanic} onChange={setMechanic} />
      </Card>

      <Card style={{ gap: spacing(0.5) }}>
        <Title style={{ fontSize: 16 }}>Opérations réalisées</Title>
        {OPERATION_CATALOG.map((op) => (
          <View key={op.code} style={styles.opRow}>
            <Muted style={{ color: colors.text, flex: 1 }}>{op.label}</Muted>
            <Switch
              value={!!checked[op.code]}
              onValueChange={() => toggle(op.code)}
              trackColor={{ true: colors.success, false: colors.surfaceAlt }}
            />
          </View>
        ))}
      </Card>

      <Card style={{ gap: spacing(1) }}>
        <View style={{ flexDirection: 'row', gap: spacing(1) }}>
          <View style={{ flex: 1 }}>
            <Field label="Heures MO" value={hours} onChange={setHours} keyboard="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Coût (€)" value={cost} onChange={setCost} keyboard="decimal-pad" />
          </View>
        </View>
        <Field label="Notes" value={notes} onChange={setNotes} multiline />
      </Card>

      <Button title="💾 Enregistrer la fiche" variant="success" onPress={save} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard = 'default',
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Muted>{label}</Muted>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.5),
    height: 46,
    fontSize: 15,
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
