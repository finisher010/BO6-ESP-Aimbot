import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Button, Card, Muted, Title } from '@/components/ui';
import { useFleetStore } from '@/store/useFleetStore';
import {
  exportInterventionsCsv,
  exportVehiclesCsv,
  importVehiclesCsv,
  pushInterventions,
} from '@/services/pagilog';
import { colors, radius, spacing } from '@/theme';

export default function PagilogSyncScreen() {
  const vehicles = useFleetStore((s) => s.vehicles);
  const interventions = useFleetStore((s) => s.interventions);
  const setVehicles = useFleetStore((s) => s.setVehicles);
  const markSynced = useFleetStore((s) => s.markSynced);
  const pagilog = useFleetStore((s) => s.pagilog);
  const setPagilog = useFleetStore((s) => s.setPagilog);

  const [baseUrl, setBaseUrl] = useState(pagilog.baseUrl);
  const [apiKey, setApiKey] = useState(pagilog.apiKey);
  const [enabled, setEnabled] = useState(pagilog.enabled);
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = interventions.filter((i) => i.syncStatus !== 'synced');

  function saveConfig() {
    setPagilog({ enabled, baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
    Alert.alert('Enregistré', 'Configuration PAGILOG mise à jour.');
  }

  async function shareCsv(filename: string, content: string) {
    try {
      const uri = `${FileSystem.cacheDirectory ?? ''}${filename}`;
      await FileSystem.writeAsStringAsync(uri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv' });
      } else {
        Alert.alert('Export prêt', `Fichier écrit : ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export', e.message ?? String(e));
    }
  }

  function doImport() {
    if (!importText.trim()) {
      Alert.alert('Import', 'Collez d’abord le contenu CSV du parc.');
      return;
    }
    try {
      const imported = importVehiclesCsv(importText, Date.now());
      if (imported.length === 0) {
        Alert.alert('Import', 'Aucun véhicule reconnu dans le CSV.');
        return;
      }
      Alert.alert('Importer', `${imported.length} véhicule(s) détecté(s). Remplacer le parc actuel ?`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Remplacer',
          onPress: () => {
            setVehicles(imported);
            setImportText('');
            Alert.alert('Importé', `${imported.length} véhicule(s) importé(s).`);
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Import', e.message ?? String(e));
    }
  }

  async function push() {
    setBusy(true);
    try {
      const res = await pushInterventions(
        { enabled, baseUrl: baseUrl.trim(), apiKey: apiKey.trim() },
        pending,
        vehicles
      );
      if (res.ok) {
        markSynced(pending.map((i) => i.id));
      }
      Alert.alert(res.ok ? 'Synchronisé' : 'Échec', res.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5) }}>
      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Connexion PAGILOG (API REST)</Title>
        <Muted>
          À activer quand l’URL et la clé d’API PAGILOG sont connues. Sans cela, utilisez
          l’export/import CSV ci-dessous.
        </Muted>
        <View style={styles.rowBetween}>
          <Muted style={{ color: colors.text }}>Activer l’API</Muted>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.success }} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="URL de l’API (https://…)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={baseUrl}
          onChangeText={setBaseUrl}
        />
        <TextInput
          style={styles.input}
          placeholder="Clé d’API"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
          value={apiKey}
          onChangeText={setApiKey}
        />
        <Button title="💾 Enregistrer" onPress={saveConfig} />
        <Button
          title={`⬆️ Envoyer ${pending.length} fiche(s) vers PAGILOG`}
          variant="success"
          onPress={push}
          loading={busy}
          disabled={pending.length === 0}
        />
      </Card>

      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Export CSV (compatible tout logiciel)</Title>
        <Button
          title="📤 Exporter le parc (véhicules)"
          variant="secondary"
          onPress={() => shareCsv('vehicules_pagilog.csv', exportVehiclesCsv(vehicles))}
        />
        <Button
          title="📤 Exporter les interventions"
          variant="secondary"
          onPress={() =>
            shareCsv('interventions_pagilog.csv', exportInterventionsCsv(interventions, vehicles))
          }
        />
      </Card>

      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Import du parc (CSV)</Title>
        <Muted>
          Collez le CSV exporté de PAGILOG (colonnes : immatriculation;marque;modele;annee;vin;km;pagilog_id).
        </Muted>
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
          placeholder="immatriculation;marque;modele;annee;vin;km;pagilog_id&#10;AB-123-CD;Renault;Master;2021;;150000;"
          placeholderTextColor={colors.textMuted}
          multiline
          value={importText}
          onChangeText={setImportText}
        />
        <Button title="📥 Importer le parc" onPress={doImport} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.5),
    minHeight: 46,
    fontSize: 15,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
