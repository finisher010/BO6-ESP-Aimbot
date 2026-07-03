import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Badge, Button, Card, Muted, Title } from '@/components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { verifyPin } from '@/services/auth';
import { Employee } from '@/types';
import { colors, radius, spacing } from '@/theme';

/**
 * Sélecteur de profil employé. Utilisé au démarrage (porte de connexion) et
 * pour changer d'utilisateur depuis l'app. Demande le PIN si le profil en a un.
 */
export default function ProfilePicker({ onDone }: { onDone?: () => void }) {
  const employees = useAuthStore((s) => s.employees);
  const login = useAuthStore((s) => s.login);

  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function choose(emp: Employee) {
    setError(null);
    setPin('');
    if (emp.pin) {
      setSelected(emp);
    } else {
      login(emp.id);
      onDone?.();
    }
  }

  function submitPin() {
    if (!selected) return;
    if (verifyPin(selected, pin)) {
      login(selected.id);
      onDone?.();
    } else {
      setError('Code PIN incorrect.');
    }
  }

  if (selected) {
    return (
      <View style={styles.center}>
        <Card style={{ width: '100%', maxWidth: 360, gap: spacing(1.5) }}>
          <Title style={{ fontSize: 18 }}>Bonjour {selected.name}</Title>
          <Muted>Entrez votre code PIN à 4 chiffres.</Muted>
          <TextInput
            style={styles.pin}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            autoFocus
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
          />
          {error && <Muted style={{ color: colors.danger }}>{error}</Muted>}
          <Button title="Se connecter" onPress={submitPin} />
          <Button title="Retour" variant="secondary" onPress={() => setSelected(null)} />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={{ fontSize: 22 }}>Qui êtes-vous ?</Title>
      <Muted>Choisissez votre profil pour accéder à vos fonctions.</Muted>
      {employees.map((emp) => (
        <TouchableOpacity key={emp.id} activeOpacity={0.8} onPress={() => choose(emp)}>
          <Card style={styles.row}>
            <View style={styles.avatar}>
              <Title style={{ fontSize: 18 }}>{emp.name.charAt(0).toUpperCase()}</Title>
            </View>
            <View style={{ flex: 1 }}>
              <Title style={{ fontSize: 16 }}>{emp.name}</Title>
              <Muted>{emp.isAdmin ? 'Administrateur' : 'Employé'}</Muted>
            </View>
            {emp.pin ? <Badge label="🔒 PIN" color={colors.textMuted} /> : null}
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(2), gap: spacing(1.5) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(2) },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    height: 56,
  },
});
