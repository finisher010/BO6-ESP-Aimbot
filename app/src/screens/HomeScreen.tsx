import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Button, Card, Muted, Title } from '@/components/ui';
import { useTourStore } from '@/store/useTourStore';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const stops = useTourStore((s) => s.stops);
  const route = useTourStore((s) => s.route);
  const vehicle = useTourStore((s) => s.vehicle);
  const pending = stops.filter((s) => s.status === 'pending').length;
  const geocoded = stops.filter((s) => s.coordinate).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Title>Bonjour 👋</Title>
        <Muted style={{ marginTop: 4 }}>
          Scannez vos adresses, optimisez la tournée en évitant les ponts trop bas,
          puis laissez-vous guider à la voix.
        </Muted>
        <View style={styles.statsRow}>
          <Stat label="Arrêts" value={String(stops.length)} />
          <Stat label="Géocodés" value={`${geocoded}/${stops.length}`} />
          <Stat label="À livrer" value={String(pending)} />
        </View>
      </Card>

      <Button title="📷 Scanner une adresse" onPress={() => navigation.navigate('Capture')} />
      <Button
        title={`📋 Mes arrêts (${stops.length})`}
        variant="secondary"
        onPress={() => navigation.navigate('Stops')}
      />
      <Button
        title="🧭 Optimiser la tournée"
        variant="success"
        onPress={() => navigation.navigate('Route')}
        disabled={geocoded < 1}
      />
      {route && (
        <Button
          title="🚚 Reprendre le guidage"
          onPress={() => navigation.navigate('Navigation')}
        />
      )}

      <Card style={{ marginTop: spacing(1) }}>
        <Muted>
          Profil véhicule : hauteur {vehicle.heightM.toFixed(2)} m · marge{' '}
          {vehicle.clearanceMarginM.toFixed(2)} m
        </Muted>
        <Button
          title="⚙️ Paramètres & profil véhicule"
          variant="secondary"
          style={{ marginTop: spacing(1.5) }}
          onPress={() => navigation.navigate('Settings')}
        />
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Title style={{ fontSize: 22 }}>{value}</Title>
      <Muted>{label}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(2), gap: spacing(1.5) },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing(2),
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing(1.5),
    marginHorizontal: 4,
    borderRadius: 12,
  },
});
