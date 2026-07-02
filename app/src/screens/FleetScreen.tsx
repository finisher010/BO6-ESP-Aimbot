import React, { useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useFleetStore } from '@/store/useFleetStore';
import { computeDue, dueCount } from '@/services/maintenanceSchedule';
import { todayIso } from '@/utils/date';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Fleet'>;

export default function FleetScreen({ navigation }: Props) {
  const vehicles = useFleetStore((s) => s.vehicles);
  const interventions = useFleetStore((s) => s.interventions);
  const addVehicle = useFleetStore((s) => s.addVehicle);

  const [adding, setAdding] = useState(false);
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [km, setKm] = useState('');

  function submit() {
    if (!plate.trim()) return;
    addVehicle({
      plate: plate.trim().toUpperCase(),
      make: make.trim(),
      model: model.trim(),
      mileageKm: parseInt(km, 10) || 0,
    });
    setPlate('');
    setMake('');
    setModel('');
    setKm('');
    setAdding(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5), paddingBottom: spacing(12) }}
        ListHeaderComponent={
          <View style={{ gap: spacing(1.5), marginBottom: spacing(0.5) }}>
            <Button
              title="🔄 Synchronisation PAGILOG"
              variant="secondary"
              onPress={() => navigation.navigate('PagilogSync')}
            />
            {adding ? (
              <Card style={{ gap: spacing(1) }}>
                <Title style={{ fontSize: 16 }}>Nouveau véhicule</Title>
                <TextInput style={styles.input} placeholder="Immatriculation *" placeholderTextColor={colors.textMuted} autoCapitalize="characters" value={plate} onChangeText={setPlate} />
                <View style={{ flexDirection: 'row', gap: spacing(1) }}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Marque" placeholderTextColor={colors.textMuted} value={make} onChangeText={setMake} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Modèle" placeholderTextColor={colors.textMuted} value={model} onChangeText={setModel} />
                </View>
                <TextInput style={styles.input} placeholder="Kilométrage" placeholderTextColor={colors.textMuted} keyboardType="number-pad" value={km} onChangeText={setKm} />
                <View style={{ flexDirection: 'row', gap: spacing(1) }}>
                  <Button title="Annuler" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
                  <Button title="Ajouter" variant="success" onPress={submit} style={{ flex: 1 }} />
                </View>
              </Card>
            ) : (
              <Button title="➕ Ajouter un véhicule" onPress={() => setAdding(true)} />
            )}
          </View>
        }
        ListEmptyComponent={
          <Muted style={{ textAlign: 'center', marginTop: spacing(3) }}>
            Aucun véhicule. Ajoutez-en un ou importez le parc depuis PAGILOG.
          </Muted>
        }
        renderItem={({ item }) => {
          const due = computeDue(item, interventions, todayIso());
          const count = dueCount(due);
          const overdue = due.filter((d) => d.severity === 'overdue').length;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
            >
              <Card style={{ gap: spacing(0.5) }}>
                <View style={styles.row}>
                  <Title style={{ fontSize: 17 }}>{item.plate}</Title>
                  {overdue > 0 ? (
                    <Badge label={`${overdue} en retard`} color={colors.danger} />
                  ) : count > 0 ? (
                    <Badge label={`${count} à prévoir`} color={colors.warning} />
                  ) : (
                    <Badge label="À jour" color={colors.success} />
                  )}
                </View>
                <Muted>
                  {item.make} {item.model} · {item.mileageKm.toLocaleString('fr-FR')} km
                </Muted>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.5),
    height: 46,
    fontSize: 15,
  },
});
