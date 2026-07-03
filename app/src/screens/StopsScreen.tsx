import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useTourStore } from '@/store/useTourStore';
import { geocode } from '@/services/geocoding';
import { getCurrentPosition } from '@/services/location';
import { Stop } from '@/types';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Stops'>;

export default function StopsScreen({ navigation }: Props) {
  const stops = useTourStore((s) => s.stops);
  const addStop = useTourStore((s) => s.addStop);
  const updateStop = useTourStore((s) => s.updateStop);
  const removeStop = useTourStore((s) => s.removeStop);
  const clearStops = useTourStore((s) => s.clearStops);
  const [manual, setManual] = useState('');
  const [geocoding, setGeocoding] = useState<string | null>(null);

  async function addManual() {
    const text = manual.trim();
    if (!text) return;
    setManual('');
    const near = (await getCurrentPosition()) ?? undefined;
    try {
      const geo = await geocode(text, near);
      addStop(text, geo?.coordinate, geo?.displayName);
    } catch {
      addStop(text);
    }
  }

  async function retryGeocode(stop: Stop) {
    try {
      setGeocoding(stop.id);
      const near = (await getCurrentPosition()) ?? undefined;
      const geo = await geocode(stop.label, near);
      if (geo) {
        updateStop(stop.id, {
          coordinate: geo.coordinate,
          resolvedAddress: geo.displayName,
        });
      } else {
        Alert.alert('Introuvable', 'Aucun résultat. Précisez l’adresse (ville, code postal).');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? String(e));
    } finally {
      setGeocoding(null);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={{ margin: spacing(2), gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Ajouter manuellement</Title>
        <View style={{ flexDirection: 'row', gap: spacing(1) }}>
          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder="12 rue de la Paix, 75002 Paris"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            onSubmitEditing={addManual}
          />
          <Button title="+" onPress={addManual} style={{ paddingHorizontal: spacing(2.5) }} />
        </View>
      </Card>

      <FlatList
        data={stops}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: spacing(2), paddingBottom: spacing(12), gap: spacing(1) }}
        ListEmptyComponent={
          <Muted style={{ textAlign: 'center', marginTop: spacing(4) }}>
            Aucun arrêt. Scannez une adresse ou ajoutez-en une ci-dessus.
          </Muted>
        }
        renderItem={({ item, index }) => (
          <Card style={{ gap: spacing(0.5) }}>
            <View style={styles.row}>
              <Text style={styles.index}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                {item.resolvedAddress ? (
                  <Muted>{item.resolvedAddress}</Muted>
                ) : (
                  <Badge label="Non géocodé" color={colors.warning} />
                )}
              </View>
              {item.coordinate ? (
                <Badge label="📍 OK" color={colors.success} />
              ) : null}
            </View>
            <View style={styles.actions}>
              {!item.coordinate && (
                <SmallBtn
                  label={geocoding === item.id ? '…' : 'Géocoder'}
                  onPress={() => retryGeocode(item)}
                />
              )}
              <SmallBtn
                label="Supprimer"
                color={colors.danger}
                onPress={() =>
                  Alert.alert('Supprimer ?', item.label, [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => removeStop(item.id) },
                  ])
                }
              />
            </View>
          </Card>
        )}
      />

      <View style={styles.footer}>
        {stops.length > 0 && (
          <Button
            title="🗑️ Tout effacer"
            variant="secondary"
            onPress={() =>
              Alert.alert('Tout effacer ?', 'Cette action supprime tous les arrêts.', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Effacer', style: 'destructive', onPress: clearStops },
              ])
            }
            style={{ flex: 1 }}
          />
        )}
        <Button
          title="🧭 Optimiser →"
          variant="success"
          onPress={() => navigation.navigate('Route')}
          disabled={stops.filter((s) => s.coordinate).length < 1}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function SmallBtn({
  label,
  onPress,
  color = colors.primary,
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.smallBtn, { borderColor: color }]}>
      <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.5),
    fontSize: 15,
    height: 48,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  index: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing(1), marginTop: spacing(0.5) },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing(1),
    padding: spacing(2),
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
