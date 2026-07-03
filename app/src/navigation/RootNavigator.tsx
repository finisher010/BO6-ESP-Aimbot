import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/theme';
import { ParsedSheet } from '@/services/maintenanceOcr';
import HomeScreen from '@/screens/HomeScreen';
import CaptureScreen from '@/screens/CaptureScreen';
import StopsScreen from '@/screens/StopsScreen';
import RouteScreen from '@/screens/RouteScreen';
import NavigationScreen from '@/screens/NavigationScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import FleetScreen from '@/screens/FleetScreen';
import VehicleDetailScreen from '@/screens/VehicleDetailScreen';
import InterventionFormScreen from '@/screens/InterventionFormScreen';
import PaperScanScreen from '@/screens/PaperScanScreen';
import PagilogSyncScreen from '@/screens/PagilogSyncScreen';
import ManageEmployeesScreen from '@/screens/ManageEmployeesScreen';
import SwitchProfileScreen from '@/screens/SwitchProfileScreen';

export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  Stops: undefined;
  Route: undefined;
  Navigation: undefined;
  Settings: undefined;
  Fleet: undefined;
  VehicleDetail: { vehicleId: string };
  InterventionForm: { vehicleId: string; prefill?: ParsedSheet };
  PaperScan: { vehicleId?: string };
  PagilogSync: undefined;
  ManageEmployees: undefined;
  SwitchProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil' }} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: 'Scanner une adresse' }} />
        <Stack.Screen name="Stops" component={StopsScreen} options={{ title: 'Mes arrêts' }} />
        <Stack.Screen name="Route" component={RouteScreen} options={{ title: 'Tournée optimisée' }} />
        <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Guidage', headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
        <Stack.Screen name="Fleet" component={FleetScreen} options={{ title: 'Entretien du parc' }} />
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Véhicule' }} />
        <Stack.Screen name="InterventionForm" component={InterventionFormScreen} options={{ title: 'Fiche d’entretien' }} />
        <Stack.Screen name="PaperScan" component={PaperScanScreen} options={{ title: 'Scanner une fiche' }} />
        <Stack.Screen name="PagilogSync" component={PagilogSyncScreen} options={{ title: 'PAGILOG' }} />
        <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} options={{ title: 'Employés & accès' }} />
        <Stack.Screen name="SwitchProfile" component={SwitchProfileScreen} options={{ title: 'Changer de profil' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
