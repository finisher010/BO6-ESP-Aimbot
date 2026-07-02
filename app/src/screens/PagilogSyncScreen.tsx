import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Card, Muted, Title } from '@/components/ui';
import { useFleetStore } from '@/store/useFleetStore';
import {
  exportInterventionsCsv,
  exportVehiclesCsv,
  importVehiclesCsv,
  pushInterventions,
} from '@/services/pagilog';
import {
  exportInterventionsXlsx,
  exportVehiclesXlsx,
  importVehiclesXlsx,
} from '@/services/excel';
import { Vehicle } from '@/types';
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

  async function shareFile(
    filename: string,
    content: string,
    encoding: FileSystem.EncodingType,
    mimeType: string
  ) {
    try {
      const uri = `${FileSystem.cacheDirectory ?? ''}${filename}`;
      await FileSystem.writeAsStringAsync(uri, content, { encoding });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType });
      } else {
        Alert.alert('Export prêt', `Fichier écrit : ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export', e.message ?? String(e));
    }
  }

  const shareCsv = (filename: string, content: string) =>
    shareFile(filename, content, FileSystem.EncodingType.UTF8, 'text/csv');

  const shareXlsx = (filename: string, base64: string) =>
    shareFile(
      filename,
      base64,
      FileSystem.EncodingType.Base64,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

  function confirmReplace(imported: Vehicle[]) {
    if (imported.length === 0) {
      Alert.alert('Import', 'Aucun véhicule reconnu dans le fichier.');
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
  }

  async function importXlsx() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const base64 = await FileSystem.readAsStringAsync(res.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      confirmReplace(importVehiclesXlsx(base64, Date.now()));
    } catch (e: any) {
      Alert.alert('Import Excel', e.message ?? String(e));
    }
  }

  function doImport() {
    if (!importText.trim()) {
      Alert.alert('Import', 'Collez d’abord le contenu CSV du parc.');
      return;
    }
    try {
      confirmReplace(importVehiclesCsv(importText, Date.now()));
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
        <Title style={{ fontSize: 16 }}>Export (compatible tout logiciel)</Title>
        <Muted>CSV (;, UTF-8) ou Excel (.xlsx).</Muted>
        <View style={{ flexDirection: 'row', gap: spacing(1) }}>
          <Button
            title="📤 Parc CSV"
            variant="secondary"
            onPress={() => shareCsv('vehicules_pagilog.csv', exportVehiclesCsv(vehicles))}
            style={{ flex: 1 }}
          />
          <Button
            title="📤 Parc Excel"
            variant="secondary"
            onPress={() => shareXlsx('vehicules_pagilog.xlsx', exportVehiclesXlsx(vehicles))}
            style={{ flex: 1 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing(1) }}>
          <Button
            title="📤 Interv. CSV"
            variant="secondary"
            onPress={() =>
              shareCsv('interventions_pagilog.csv', exportInterventionsCsv(interventions, vehicles))
            }
            style={{ flex: 1 }}
          />
          <Button
            title="📤 Interv. Excel"
            variant="secondary"
            onPress={() =>
              shareXlsx(
                'interventions_pagilog.xlsx',
                exportInterventionsXlsx(interventions, vehicles)
              )
            }
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Import du parc</Title>
        <Button title="📂 Importer un fichier Excel (.xlsx)" onPress={importXlsx} />
        <Muted style={{ marginTop: spacing(0.5) }}>
          …ou collez le CSV exporté de PAGILOG (colonnes : immatriculation;marque;modele;annee;vin;km;pagilog_id).
        </Muted>
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
          placeholder="immatriculation;marque;modele;annee;vin;km;pagilog_id&#10;AB-123-CD;Renault;Master;2021;;150000;"
          placeholderTextColor={colors.textMuted}
          multiline
          value={importText}
          onChangeText={setImportText}
        />
        <Button title="📥 Importer le CSV collé" onPress={doImport} />
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
