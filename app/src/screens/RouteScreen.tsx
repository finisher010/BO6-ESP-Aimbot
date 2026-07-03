import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useTourStore } from '@/store/useTourStore';
import { optimizeRoute } from '@/services/optimizer';
import { fetchDirections } from '@/services/routing';
import { detectBridgeConflicts } from '@/services/bridges';
import { getCurrentPosition } from '@/services/location';
import { OptimizedRoute } from '@/types';
import { formatDistance, formatDuration } from '@/utils/geo';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;

export default function RouteScreen({ navigation }: Props) {
  const stops = useTourStore((s) => s.stops);
  const vehicle = useTourStore((s) => s.vehicle);
  const route = useTourStore((s) => s.route);
  const setRoute = useTourStore((s) => s.setRoute);
  const reorderStops = useTourStore((s) => s.reorderStops);
  const setCurrentPosition = useTourStore((s) => s.setCurrentPosition);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geocoded = stops.filter((s) => s.coordinate);

  useEffect(() => {
    if (!route && geocoded.length > 0) compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function compute() {
    setBusy(true);
    setError(null);
    try {
      const start = (await getCurrentPosition()) ?? geocoded[0].coordinate!;
      setCurrentPosition(start);

      const opt = await optimizeRoute({
        start,
        stops: geocoded.map((s) => ({ id: s.id, coordinate: s.coordinate! })),
        returnToStart: false,
      });

      // Ordre = départ + arrêts optimisés.
      const orderedStops = opt.orderedStopIds.map(
        (id) => geocoded.find((s) => s.id === id)!
      );
      const ordered = [
        { id: '__start__', coordinate: start },
        ...orderedStops.map((s) => ({ id: s.id, coordinate: s.coordinate! })),
      ];

      const directions = await fetchDirections(ordered);
      const bridgeWarnings = detectBridgeConflicts(directions.legs, vehicle);

      const result: OptimizedRoute = {
        orderedStopIds: opt.orderedStopIds,
        legs: directions.legs,
        steps: directions.steps,
        totalDistanceM: directions.totalDistanceM,
        totalDurationS: directions.totalDurationS,
        bridgeWarnings,
        computedAt: Date.now(),
      };
      setRoute(result);
      reorderStops(opt.orderedStopIds);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  const orderedStops = route
    ? route.orderedStopIds.map((id) => stops.find((s) => s.id === id)!).filter(Boolean)
    : geocoded;

  const polyline = route?.legs.flatMap((l) => l.geometry) ?? [];
  const region = orderedStops[0]?.coordinate
    ? {
        latitude: orderedStops[0].coordinate.latitude,
        longitude: orderedStops[0].coordinate.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5) }}>
      <View style={styles.mapWrap}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
        >
          {polyline.length > 1 && (
            <Polyline coordinates={polyline} strokeColor={colors.primary} strokeWidth={5} />
          )}
          {orderedStops.map(
            (s, i) =>
              s.coordinate && (
                <Marker
                  key={s.id}
                  coordinate={s.coordinate}
                  title={`${i + 1}. ${s.label}`}
                  description={s.resolvedAddress}
                />
              )
          )}
          {route?.bridgeWarnings.map((w) => (
            <Marker
              key={w.bridge.id}
              coordinate={w.bridge.coordinate}
              pinColor={colors.danger}
              title={`⚠️ Pont ${w.bridge.maxHeightM} m`}
              description={w.bridge.name}
            />
          ))}
        </MapView>
      </View>

      {busy && (
        <Card style={{ alignItems: 'center', gap: spacing(1) }}>
          <ActivityIndicator color={colors.primary} />
          <Muted>Optimisation de la tournée…</Muted>
        </Card>
      )}

      {error && (
        <Card style={{ borderColor: colors.danger }}>
          <Title style={{ fontSize: 15, color: colors.danger }}>Erreur</Title>
          <Muted style={{ marginTop: 4 }}>{error}</Muted>
          <Button title="Réessayer" onPress={compute} style={{ marginTop: spacing(1) }} />
        </Card>
      )}

      {route && (
        <>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Metric label="Distance" value={formatDistance(route.totalDistanceM)} />
            <Metric label="Durée" value={formatDuration(route.totalDurationS)} />
            <Metric label="Arrêts" value={String(orderedStops.length)} />
          </Card>

          {route.bridgeWarnings.length > 0 && (
            <Card style={{ borderColor: colors.danger, gap: spacing(1) }}>
              <Title style={{ fontSize: 15, color: colors.danger }}>
                ⚠️ {route.bridgeWarnings.length} pont(s) trop bas sur le trajet
              </Title>
              {route.bridgeWarnings.map((w) => (
                <Muted key={w.bridge.id}>
                  • {w.bridge.name} — {w.bridge.maxHeightM.toFixed(2)} m (véhicule{' '}
                  {w.vehicleHeightM.toFixed(2)} m)
                </Muted>
              ))}
              <Muted style={{ fontStyle: 'italic' }}>
                Vous serez prévenu vocalement à l’approche. Adaptez l’itinéraire si besoin.
              </Muted>
            </Card>
          )}

          <Card style={{ gap: spacing(1) }}>
            <Title style={{ fontSize: 16 }}>Ordre de passage</Title>
            {orderedStops.map((s, i) => (
              <View key={s.id} style={styles.stopRow}>
                <Title style={{ fontSize: 16, width: 28 }}>{i + 1}</Title>
                <View style={{ flex: 1 }}>
                  <Muted style={{ color: colors.text }}>{s.label}</Muted>
                  {s.status !== 'pending' && (
                    <Badge
                      label={s.status === 'done' ? 'Livré' : 'Ignoré'}
                      color={s.status === 'done' ? colors.success : colors.textMuted}
                    />
                  )}
                </View>
              </View>
            ))}
          </Card>

          <Button title="🔄 Recalculer" variant="secondary" onPress={compute} />
          <Button
            title="🚚 Démarrer le guidage vocal"
            variant="success"
            onPress={() => navigation.navigate('Navigation')}
          />
        </>
      )}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Title style={{ fontSize: 18 }}>{value}</Title>
      <Muted>{label}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    height: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
});
