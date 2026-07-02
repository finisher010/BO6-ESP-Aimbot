import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useTourStore } from '@/store/useTourStore';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const stops = useTourStore((s) => s.stops);
  const route = useTourStore((s) => s.route);
  const vehicle = useTourStore((s) => s.vehicle);
  const pending = stops.filter((s) => s.status === 'pending').length;
  const geocoded = stops.filter((s) => s.coordinate).length;

  const current = useAuthStore((s) => s.current());
  const can = useAuthStore((s) => s.can);

  // Regroupe les fonctions du module Tournée réellement autorisées.
  const tourFeatures = [
    can('tour.capture'),
    can('tour.stops'),
    can('tour.optimize'),
    can('tour.navigate'),
    can('tour.settings'),
  ].some(Boolean);
  const showFleet = can('fleet.view');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <View style={styles.profileRow}>
          <View style={{ flex: 1 }}>
            <Title>Bonjour {current?.name ?? ''} 👋</Title>
            <Muted style={{ marginTop: 2 }}>
              {current?.isAdmin ? 'Administrateur' : 'Employé'} · accès personnalisés
            </Muted>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('SwitchProfile')}>
            <Badge label="Changer" color={colors.primary} />
          </TouchableOpacity>
        </View>
        {tourFeatures && (
          <View style={styles.statsRow}>
            <Stat label="Arrêts" value={String(stops.length)} />
            <Stat label="Géocodés" value={`${geocoded}/${stops.length}`} />
            <Stat label="À livrer" value={String(pending)} />
          </View>
        )}
      </Card>

      {can('tour.capture') && (
        <Button title="📷 Scanner une adresse" onPress={() => navigation.navigate('Capture')} />
      )}
      {can('tour.stops') && (
        <Button
          title={`📋 Mes arrêts (${stops.length})`}
          variant="secondary"
          onPress={() => navigation.navigate('Stops')}
        />
      )}
      {can('tour.optimize') && (
        <Button
          title="🧭 Optimiser la tournée"
          variant="success"
          onPress={() => navigation.navigate('Route')}
          disabled={geocoded < 1}
        />
      )}
      {route && can('tour.navigate') && (
        <Button title="🚚 Reprendre le guidage" onPress={() => navigation.navigate('Navigation')} />
      )}

      {showFleet && (
        <Button
          title="🔧 Entretien du parc"
          variant="secondary"
          onPress={() => navigation.navigate('Fleet')}
        />
      )}

      {can('tour.settings') && (
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
      )}

      {can('admin.employees') && (
        <Button
          title="👥 Employés & accès"
          variant="secondary"
          onPress={() => navigation.navigate('ManageEmployees')}
        />
      )}

      {!tourFeatures && !showFleet && !can('admin.employees') && (
        <Card>
          <Muted style={{ textAlign: 'center' }}>
            Aucune fonction ne vous est attribuée pour l’instant. Contactez votre
            administrateur.
          </Muted>
        </Card>
      )}
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
  profileRow: { flexDirection: 'row', alignItems: 'center' },
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
