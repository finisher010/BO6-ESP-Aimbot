import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Muted, Title } from '@/components/ui';
import { useTourStore } from '@/store/useTourStore';
import { getCurrentPosition } from '@/services/location';
import { colors, radius, spacing } from '@/theme';

export default function SettingsScreen() {
  const vehicle = useTourStore((s) => s.vehicle);
  const setVehicle = useTourStore((s) => s.setVehicle);
  const customBridges = useTourStore((s) => s.customBridges);
  const addCustomBridge = useTourStore((s) => s.addCustomBridge);
  const removeCustomBridge = useTourStore((s) => s.removeCustomBridge);

  const [height, setHeight] = useState(String(vehicle.heightM));
  const [weight, setWeight] = useState(String(vehicle.weightT));
  const [margin, setMargin] = useState(String(vehicle.clearanceMarginM));

  const [bridgeName, setBridgeName] = useState('');
  const [bridgeHeight, setBridgeHeight] = useState('');

  function saveVehicle() {
    const h = parseFloat(height.replace(',', '.'));
    const w = parseFloat(weight.replace(',', '.'));
    const m = parseFloat(margin.replace(',', '.'));
    if (!isFinite(h) || h <= 0) {
      Alert.alert('Hauteur invalide', 'Saisissez une hauteur en mètres (ex. 3.20).');
      return;
    }
    setVehicle({
      heightM: h,
      weightT: isFinite(w) ? w : vehicle.weightT,
      clearanceMarginM: isFinite(m) ? m : 0.2,
    });
    Alert.alert('Enregistré', 'Profil véhicule mis à jour. La tournée sera recalculée.');
  }

  async function addBridgeHere() {
    const h = parseFloat(bridgeHeight.replace(',', '.'));
    if (!bridgeName.trim() || !isFinite(h) || h <= 0) {
      Alert.alert('Champs requis', 'Nom du pont et hauteur (m) obligatoires.');
      return;
    }
    const pos = await getCurrentPosition();
    if (!pos) {
      Alert.alert('Position requise', 'Activez la localisation pour situer le pont.');
      return;
    }
    addCustomBridge({ name: bridgeName.trim(), coordinate: pos, maxHeightM: h, source: 'manuel' });
    setBridgeName('');
    setBridgeHeight('');
    Alert.alert('Pont ajouté', 'Le pont a été enregistré à votre position actuelle.');
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5) }}>
      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>🚚 Profil véhicule</Title>
        <Muted>
          Sert à éviter les ponts trop bas. Hauteur requise = hauteur + marge de sécurité.
        </Muted>
        <Field label="Hauteur (m)" value={height} onChange={setHeight} keyboard="decimal-pad" />
        <Field label="Poids (t)" value={weight} onChange={setWeight} keyboard="decimal-pad" />
        <Field label="Marge de sécurité (m)" value={margin} onChange={setMargin} keyboard="decimal-pad" />
        <Muted>
          Hauteur requise actuelle :{' '}
          <Text style={{ color: colors.primary, fontWeight: '800' }}>
            {(
              (parseFloat(height.replace(',', '.')) || 0) +
              (parseFloat(margin.replace(',', '.')) || 0)
            ).toFixed(2)}{' '}
            m
          </Text>
        </Muted>
        <Button title="💾 Enregistrer le profil" onPress={saveVehicle} />
      </Card>

      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>🌉 Ponts bas personnalisés</Title>
        <Muted>
          Ajoutez un pont à votre position actuelle. Il sera évité/annoncé pour tous les
          véhicules plus hauts.
        </Muted>
        <Field label="Nom du pont" value={bridgeName} onChange={setBridgeName} />
        <Field
          label="Hauteur libre (m)"
          value={bridgeHeight}
          onChange={setBridgeHeight}
          keyboard="decimal-pad"
        />
        <Button title="📍 Ajouter à ma position" variant="secondary" onPress={addBridgeHere} />

        {customBridges.length > 0 && (
          <View style={{ gap: spacing(0.5), marginTop: spacing(1) }}>
            {customBridges.map((b) => (
              <View key={b.id} style={styles.bridgeRow}>
                <Text style={{ color: colors.text, flex: 1 }}>
                  {b.name} — {b.maxHeightM.toFixed(2)} m
                </Text>
                <TouchableOpacity onPress={() => removeCustomBridge(b.id)}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>Suppr.</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Muted style={{ textAlign: 'center' }}>
        Données cartographiques © OpenStreetMap · Itinéraires OSRM
      </Muted>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard = 'default',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={{ gap: 4 }}>
      <Muted>{label}</Muted>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
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
    fontSize: 16,
  },
  bridgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: spacing(1.25),
    borderRadius: radius.sm,
  },
});
