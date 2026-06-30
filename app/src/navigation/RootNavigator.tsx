import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/theme';
import HomeScreen from '@/screens/HomeScreen';
import CaptureScreen from '@/screens/CaptureScreen';
import StopsScreen from '@/screens/StopsScreen';
import RouteScreen from '@/screens/RouteScreen';
import NavigationScreen from '@/screens/NavigationScreen';
import SettingsScreen from '@/screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  Stops: undefined;
  Route: undefined;
  Navigation: undefined;
  Settings: undefined;
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
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Tournée Optimizer' }} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: 'Scanner une adresse' }} />
        <Stack.Screen name="Stops" component={StopsScreen} options={{ title: 'Mes arrêts' }} />
        <Stack.Screen name="Route" component={RouteScreen} options={{ title: 'Tournée optimisée' }} />
        <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Guidage', headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
