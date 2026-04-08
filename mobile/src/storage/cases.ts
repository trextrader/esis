// mobile/src/storage/cases.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedCase } from '../engine/types';

const KEY = 'esis_saved_cases';

export async function loadAllCases(): Promise<SavedCase[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedCase[]) : [];
  } catch {
    return [];
  }
}

export async function saveCase(c: SavedCase): Promise<void> {
  const all = await loadAllCases();
  const idx = all.findIndex(x => x.id === c.id);
  if (idx >= 0) {
    all[idx] = c;
  } else {
    all.unshift(c);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function deleteCase(id: string): Promise<void> {
  const all = await loadAllCases();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(c => c.id !== id)));
}

export function newCaseId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
