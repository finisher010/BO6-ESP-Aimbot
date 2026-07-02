import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/navigation/RootNavigator';
import { useTourStore } from '@/store/useTourStore';
import { useFleetStore } from '@/store/useFleetStore';

export default function App() {
  const hydrateTour = useTourStore((s) => s.hydrate);
  const hydrateFleet = useFleetStore((s) => s.hydrate);

  useEffect(() => {
    hydrateTour();
    hydrateFleet();
  }, [hydrateTour, hydrateFleet]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
