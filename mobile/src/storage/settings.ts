// mobile/src/storage/settings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'esis_settings';

export interface AppSettings {
  hfToken: string;
  gemmaModel: string;
  tokenSetupComplete: boolean;
  serperApiKey: string;
}

const DEFAULTS: AppSettings = {
  hfToken: '',
  gemmaModel: 'google/gemma-4-27b-it',
  tokenSetupComplete: false,
  serperApiKey: '',
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(s: Partial<AppSettings>): Promise<void> {
  const current = await loadSettings();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...current, ...s }));
}

export async function getHfToken(): Promise<string> {
  const s = await loadSettings();
  return s.hfToken;
}
