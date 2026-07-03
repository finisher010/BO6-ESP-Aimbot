import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useTourStore } from '@/store/useTourStore';
import { watchPosition, LivePosition } from '@/services/location';
import {
  ANNOUNCE_DISTANCE_M,
  BRIDGE_ALERT_RADIUS_M,
  announcePhrase,
  computeNavState,
} from '@/services/navEngine';
import { requiredClearance, allBridges } from '@/services/bridges';
import { speak, speakAlert, setVoiceEnabled, stopSpeaking } from '@/services/voice';
import { formatDistance } from '@/utils/geo';
import { Badge } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

export default function NavigationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const route = useTourStore((s) => s.route);
  const stops = useTourStore((s) => s.stops);
  const vehicle = useTourStore((s) => s.vehicle);
  const setStatus = useTourStore((s) => s.setStatus);

  const [voiceOn, setVoiceOn] = useState(true);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [instruction, setInstruction] = useState('Initialisation du GPS…');
  const [subInstruction, setSubInstruction] = useState<string | null>(null);
  const [distanceToStep, setDistanceToStep] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [bridgeBanner, setBridgeBanner] = useState<string | null>(null);

  const stepIndexRef = useRef(0);
  const announcedStepRef = useRef(-1);
  const announcedBridgeRef = useRef<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const lowBridges = allBridges().filter(
    (b) => b.maxHeightM < requiredClearance(vehicle)
  );
  const polyline = route?.legs.flatMap((l) => l.geometry) ?? [];

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        stop = await watchPosition((pos) => {
          if (cancelled) return;
          handlePosition(pos);
        });
      } catch (e: any) {
        setInstruction('Localisation indisponible : ' + (e.message ?? e));
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePosition(pos: LivePosition) {
    setPosition(pos);
    setSpeedKmh(pos.speed && pos.speed > 0 ? pos.speed * 3.6 : 0);

    mapRef.current?.animateCamera(
      {
        center: { latitude: pos.latitude, longitude: pos.longitude },
        heading: pos.heading ?? 0,
        pitch: 45,
        zoom: 17,
      },
      { duration: 800 }
    );

    if (!route || route.steps.length === 0) return;

    const nav = computeNavState(pos, route.steps, stepIndexRef.current, lowBridges);
    stepIndexRef.current = nav.stepIndex;
    setInstruction(nav.currentInstruction);
    setSubInstruction(nav.nextInstruction);
    setDistanceToStep(nav.distanceToStepM);

    // Annonce vocale anticipée d'une manœuvre, une seule fois par étape.
    if (
      nav.distanceToStepM <= ANNOUNCE_DISTANCE_M &&
      announcedStepRef.current !== nav.stepIndex
    ) {
      announcedStepRef.current = nav.stepIndex;
      speak(announcePhrase(nav));
    }

    // Alerte pont bas, une fois par pont à l'entrée du rayon.
    if (nav.bridgeAhead) {
      const { bridge, distanceM } = nav.bridgeAhead;
      setBridgeBanner(
        `⚠️ Pont bas ${bridge.maxHeightM.toFixed(2)} m à ${formatDistance(distanceM)}`
      );
      if (announcedBridgeRef.current !== bridge.id) {
        announcedBridgeRef.current = bridge.id;
        speakAlert(
          `Attention, pont bas de ${bridge.maxHeightM.toFixed(1)} mètres à ${Math.round(
            distanceM
          )} mètres. Votre véhicule fait ${vehicle.heightM.toFixed(
            1
          )} mètres. Ralentissez et déviez si nécessaire.`
        );
      }
    } else {
      setBridgeBanner(null);
      if (announcedBridgeRef.current) announcedBridgeRef.current = null;
    }
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoiceEnabled(next);
  }

  const orderedStops = route
    ? route.orderedStopIds.map((id) => stops.find((s) => s.id === id)!).filter(Boolean)
    : [];
  const nextStop = orderedStops.find((s) => s.status === 'pending');

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        followsUserLocation
        showsCompass
      >
        {polyline.length > 1 && (
          <Polyline coordinates={polyline} strokeColor={colors.primary} strokeWidth={6} />
        )}
        {orderedStops.map(
          (s, i) =>
            s.coordinate && (
              <Marker key={s.id} coordinate={s.coordinate} title={`${i + 1}. ${s.label}`} />
            )
        )}
        {lowBridges.map((b) => (
          <Marker
            key={b.id}
            coordinate={b.coordinate}
            pinColor={colors.danger}
            title={`Pont ${b.maxHeightM} m`}
          />
        ))}
        {position && (
          <Marker
            coordinate={position}
            flat
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={position.heading ?? 0}
          >
            <View style={styles.puck} />
          </Marker>
        )}
      </MapView>

      {/* Bandeau d'instruction */}
      <View style={[styles.instructionBar, { paddingTop: insets.top + spacing(1) }]}>
        <Text style={styles.distanceBig}>
          {distanceToStep > 0 ? formatDistance(distanceToStep) : ''}
        </Text>
        <Text style={styles.instruction} numberOfLines={2}>
          {instruction}
        </Text>
        {subInstruction && (
          <Text style={styles.subInstruction} numberOfLines={1}>
            puis {subInstruction}
          </Text>
        )}
      </View>

      {bridgeBanner && (
        <View style={styles.bridgeBanner}>
          <Text style={styles.bridgeText}>{bridgeBanner}</Text>
        </View>
      )}

      {/* Panneau bas */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing(1.5) }]}>
        <View style={styles.row}>
          <View>
            <Text style={styles.speed}>{Math.round(speedKmh)}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing(2) }}>
            {nextStop ? (
              <>
                <Text style={styles.nextLabel}>Prochain arrêt</Text>
                <Text style={styles.nextStop} numberOfLines={1}>
                  {nextStop.label}
                </Text>
              </>
            ) : (
              <Badge label="Tournée terminée 🎉" color={colors.success} />
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <CircleBtn label={voiceOn ? '🔊' : '🔇'} onPress={toggleVoice} />
          {nextStop && (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setStatus(nextStop.id, 'done');
                speak('Arrêt livré. Direction le prochain point.');
              }}
            >
              <Text style={styles.doneText}>✅ Marquer livré</Text>
            </TouchableOpacity>
          )}
          <CircleBtn label="✕" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </View>
  );
}

function CircleBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.circleBtn} onPress={onPress}>
      <Text style={{ fontSize: 20 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  instructionBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2),
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  distanceBig: { color: '#fff', fontSize: 30, fontWeight: '900' },
  instruction: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 2 },
  subInstruction: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  bridgeBanner: {
    position: 'absolute',
    top: 150,
    left: spacing(2),
    right: spacing(2),
    backgroundColor: colors.danger,
    padding: spacing(1.5),
    borderRadius: radius.md,
  },
  bridgeText: { color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 15 },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing(2),
    gap: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  speed: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  speedUnit: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  nextLabel: { color: colors.textMuted, fontSize: 12 },
  nextStop: { color: colors.text, fontSize: 17, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: spacing(1.75),
    borderRadius: radius.md,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  puck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
});
