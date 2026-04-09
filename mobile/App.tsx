// mobile/App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from './src/theme';
import SplashScreen from './src/screens/SplashScreen';
import TokenSetupScreen from './src/screens/TokenSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import CaseInputScreen from './src/screens/CaseInputScreen';
import RiskScreen from './src/screens/RiskScreen';
import ActionPlanScreen from './src/screens/ActionPlanScreen';
import PacketScreen from './src/screens/PacketScreen';
import HousingTrackScreen from './src/screens/HousingTrackScreen';
import LELogScreen from './src/screens/LELogScreen';
import PingScreen from './src/screens/PingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { RiskAssessment, RecommendationOutput } from './src/engine/types';

export type RootStackParamList = {
  Splash: undefined;
  TokenSetup: undefined;
  Home: undefined;
  CaseInput: { caseId?: string };
  Risk: { caseId: string; risk: RiskAssessment };
  ActionPlan: { caseId: string; recommendation: RecommendationOutput };
  Packet: { caseId: string };
  HousingTrack: { caseId: string };
  LELog: { caseId: string };
  Ping: { caseId: string };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" backgroundColor={colors.bg} />
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Splash"       component={SplashScreen}       options={{ headerShown: false }} />
          <Stack.Screen name="TokenSetup"   component={TokenSetupScreen}   options={{ headerShown: false }} />
          <Stack.Screen name="Home"         component={HomeScreen}         options={{ headerShown: false }} />
          <Stack.Screen name="CaseInput"    component={CaseInputScreen}    options={{ title: 'New Case' }} />
          <Stack.Screen name="Risk"         component={RiskScreen}         options={{ title: 'Risk Assessment' }} />
          <Stack.Screen name="ActionPlan"   component={ActionPlanScreen}   options={{ title: 'Action Plan' }} />
          <Stack.Screen name="Packet"       component={PacketScreen}       options={{ title: 'Advocacy Packet' }} />
          <Stack.Screen name="HousingTrack" component={HousingTrackScreen} options={{ title: 'Housing Track' }} />
          <Stack.Screen name="LELog"        component={LELogScreen}        options={{ title: 'Police Interaction Log' }} />
          <Stack.Screen name="Ping"         component={PingScreen}         options={{ title: 'Community Ping' }} />
          <Stack.Screen name="Settings"     component={SettingsScreen}     options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
