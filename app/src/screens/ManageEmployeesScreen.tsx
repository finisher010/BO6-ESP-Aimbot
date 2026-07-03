import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useFleetStore } from '@/store/useFleetStore';
import { PERMISSION_CATALOG, PERMISSION_GROUPS } from '@/data/permissions';
import { ROLE_TEMPLATES, roleById } from '@/data/roles';
import { normalizePin } from '@/services/auth';
import { DirectoryStatus } from '@/services/directorySync';
import { Employee } from '@/types';
import { colors, radius, spacing } from '@/theme';

const STATUS_LABEL: Record<DirectoryStatus, { text: string; color: string }> = {
  off: { text: 'Synchro PAGILOG désactivée', color: colors.textMuted },
  connecting: { text: 'Connexion à PAGILOG…', color: colors.warning },
  live: { text: 'Synchronisé en temps réel (WebSocket)', color: colors.success },
  polling: { text: 'Synchronisé (rafraîchissement périodique)', color: colors.success },
  error: { text: 'Erreur de synchronisation PAGILOG', color: colors.danger },
};

type Props = NativeStackScreenProps<RootStackParamList, 'ManageEmployees'>;

export default function ManageEmployeesScreen(_props: Props) {
  const employees = useAuthStore((s) => s.employees);
  const current = useAuthStore((s) => s.current());
  const addEmployee = useAuthStore((s) => s.addEmployee);
  const directoryStatus = useAuthStore((s) => s.directoryStatus);
  const directoryError = useAuthStore((s) => s.directoryError);
  const [name, setName] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const status = STATUS_LABEL[directoryStatus];

  if (!current?.isAdmin) {
    return (
      <View style={styles.center}>
        <Title>Accès réservé</Title>
        <Muted style={{ textAlign: 'center', marginTop: spacing(1) }}>
          Seul un administrateur peut gérer les employés et leurs droits.
        </Muted>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(2), gap: spacing(1.5) }}>
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Muted style={{ color: colors.text, flex: 1 }}>{status.text}</Muted>
        </View>
        {directoryError ? <Muted style={{ color: colors.danger }}>{directoryError}</Muted> : null}
        <Muted>
          Les profils marqués « PAGILOG » sont gérés de façon centralisée et se
          mettent à jour automatiquement. Configurez la connexion dans l’écran PAGILOG.
        </Muted>
      </Card>

      <Card style={{ gap: spacing(1) }}>
        <Title style={{ fontSize: 16 }}>Ajouter un employé</Title>
        <View style={{ flexDirection: 'row', gap: spacing(1) }}>
          <TextInput
            style={styles.input}
            placeholder="Nom de l’employé"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <Button
            title="Ajouter"
            onPress={() => {
              if (!name.trim()) return;
              const e = addEmployee(name, false);
              setName('');
              setExpanded(e.id);
            }}
            style={{ paddingHorizontal: spacing(2) }}
          />
        </View>
        <Muted>Les nouveaux employés n’ont aucun accès tant que rien n’est coché.</Muted>
      </Card>

      {employees.map((emp) => (
        <EmployeeCard
          key={emp.id}
          emp={emp}
          expanded={expanded === emp.id}
          onToggleExpand={() => setExpanded(expanded === emp.id ? null : emp.id)}
        />
      ))}
    </ScrollView>
  );
}

function EmployeeCard({
  emp,
  expanded,
  onToggleExpand,
}: {
  emp: Employee;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const employees = useAuthStore((s) => s.employees);
  const updateEmployee = useAuthStore((s) => s.updateEmployee);
  const setPermission = useAuthStore((s) => s.setPermission);
  const applyRoleTo = useAuthStore((s) => s.applyRoleTo);
  const removeEmployee = useAuthStore((s) => s.removeEmployee);
  const pushEmployeeToPagilog = useAuthStore((s) => s.pushEmployeeToPagilog);
  const pagilogConfigured = useFleetStore((s) => !!s.pagilog.baseUrl);
  const [pinInput, setPinInput] = useState(emp.pin ?? '');
  const [pushing, setPushing] = useState(false);
  const roleName = roleById(emp.roleId)?.name;

  async function pushToPagilog() {
    setPushing(true);
    const res = await pushEmployeeToPagilog(emp.id);
    setPushing(false);
    Alert.alert(res.ok ? 'Envoyé' : 'Échec', res.message);
  }

  const adminCount = employees.filter((e) => e.isAdmin).length;
  const grantedCount = emp.isAdmin
    ? PERMISSION_CATALOG.length
    : PERMISSION_CATALOG.filter((p) => emp.permissions[p.key]).length;

  function toggleAdmin(value: boolean) {
    if (!value && emp.isAdmin && adminCount <= 1) {
      Alert.alert('Action impossible', 'Il doit rester au moins un administrateur.');
      return;
    }
    updateEmployee(emp.id, { isAdmin: value });
  }

  function savePin() {
    const pin = normalizePin(pinInput);
    updateEmployee(emp.id, { pin });
    Alert.alert('PIN', pin ? 'Code PIN enregistré.' : 'PIN retiré (profil sans code).');
  }

  function confirmDelete() {
    if (emp.isAdmin && adminCount <= 1) {
      Alert.alert('Action impossible', 'Impossible de supprimer le dernier administrateur.');
      return;
    }
    Alert.alert('Supprimer ?', emp.name, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeEmployee(emp.id) },
    ]);
  }

  return (
    <Card style={{ gap: spacing(1) }}>
      <TouchableOpacity onPress={onToggleExpand} style={styles.header}>
        <View style={{ flex: 1 }}>
          <Title style={{ fontSize: 16 }}>{emp.name}</Title>
          <Muted>
            {roleName ? `${roleName} · ` : ''}
            {emp.isAdmin ? 'Administrateur · tous les accès' : `${grantedCount}/${PERMISSION_CATALOG.length} fonctions`}
          </Muted>
        </View>
        {emp.managed ? <Badge label="PAGILOG" color={colors.primary} /> : null}
        {emp.pin ? <Badge label="🔒" color={colors.textMuted} /> : null}
        <Muted>{expanded ? '▲' : '▼'}</Muted>
      </TouchableOpacity>

      {expanded && emp.managed && (
        <Muted>
          Profil géré depuis PAGILOG (lecture seule). Les droits et le rôle sont
          définis dans PAGILOG et synchronisés automatiquement.
        </Muted>
      )}

      {expanded && !emp.managed && (
        <View style={{ gap: spacing(1) }}>
          <Muted style={{ fontWeight: '700', color: colors.primary }}>
            Appliquer un rôle (modèle de droits)
          </Muted>
          <View style={styles.chipsRow}>
            {ROLE_TEMPLATES.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => applyRoleTo(emp.id, r.id)}
                style={[styles.chip, emp.roleId === r.id && styles.chipActive]}
              >
                <Muted
                  style={{
                    color: emp.roleId === r.id ? '#fff' : colors.text,
                    fontWeight: '700',
                  }}
                >
                  {r.name}
                </Muted>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowBetween}>
            <Muted style={{ color: colors.text }}>Administrateur (tous les droits)</Muted>
            <Switch value={emp.isAdmin} onValueChange={toggleAdmin} trackColor={{ true: colors.success }} />
          </View>

          {!emp.isAdmin &&
            PERMISSION_GROUPS.map((group) => (
              <View key={group} style={{ gap: 4 }}>
                <Muted style={{ marginTop: spacing(0.5), fontWeight: '700', color: colors.primary }}>
                  {group}
                </Muted>
                {PERMISSION_CATALOG.filter((p) => p.group === group).map((p) => (
                  <View key={p.key} style={styles.permRow}>
                    <Muted style={{ color: colors.text, flex: 1 }}>{p.label}</Muted>
                    <Switch
                      value={emp.permissions[p.key] === true}
                      onValueChange={(v) => setPermission(emp.id, p.key, v)}
                      trackColor={{ true: colors.success, false: colors.surfaceAlt }}
                    />
                  </View>
                ))}
              </View>
            ))}

          <View style={{ gap: 4, marginTop: spacing(0.5) }}>
            <Muted>Code PIN (4 chiffres, vide = aucun)</Muted>
            <View style={{ flexDirection: 'row', gap: spacing(1) }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={pinInput}
                onChangeText={setPinInput}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                placeholder="----"
                placeholderTextColor={colors.textMuted}
              />
              <Button title="Enregistrer PIN" variant="secondary" onPress={savePin} />
            </View>
          </View>

          {pagilogConfigured && (
            <Button
              title="⬆️ Envoyer vers PAGILOG"
              variant="secondary"
              loading={pushing}
              onPress={pushToPagilog}
            />
          )}
          <Button title="🗑️ Supprimer l’employé" variant="danger" onPress={confirmDelete} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(3) },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(1.5),
    height: 46,
    fontSize: 15,
    flex: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
