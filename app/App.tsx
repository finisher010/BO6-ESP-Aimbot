import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/navigation/RootNavigator';
import ProfilePicker from '@/components/ProfilePicker';
import { useTourStore } from '@/store/useTourStore';
import { useFleetStore } from '@/store/useFleetStore';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme';

export default function App() {
  const hydrateTour = useTourStore((s) => s.hydrate);
  const hydrateFleet = useFleetStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  const authHydrated = useAuthStore((s) => s.hydrated);
  const currentEmployeeId = useAuthStore((s) => s.currentEmployeeId);

  useEffect(() => {
    hydrateTour();
    hydrateFleet();
    hydrateAuth();
  }, [hydrateTour, hydrateFleet, hydrateAuth]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!authHydrated ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !currentEmployeeId ? (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <ProfilePicker />
        </View>
      ) : (
        <RootNavigator />
      )}
    </SafeAreaProvider>
  );
}
