// mobile/src/screens/HomeScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { loadAllCases, deleteCase } from '../storage/cases';
import { SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [cases, setCases] = useState<SavedCase[]>([]);

  useFocusEffect(useCallback(() => {
    loadAllCases().then(setCases);
  }, []));

  const onDelete = (id: string, name: string) => {
    Alert.alert('Delete Case', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteCase(id).then(() => loadAllCases().then(setCases)),
      },
    ]);
  };

  const priorityColor = (p?: string) =>
    p === 'high' ? colors.red : p === 'medium' ? colors.amber : colors.green;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🛟 ESIS</Text>
        <Text style={styles.subtitle}>Edge Survival Intelligence System</Text>
        <Text style={styles.tagline}>Built with lived experience · Offline-first · Gemma 4 Powered</Text>
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={() => nav.navigate('CaseInput', {})}>
        <Text style={styles.newBtnText}>+ New Case</Text>
      </TouchableOpacity>

      {cases.length === 0 ? (
        <Text style={styles.empty}>No saved cases. Tap "+ New Case" to begin.</Text>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.caseCard}
              onPress={() => nav.navigate('CaseInput', { caseId: item.id })}
              onLongPress={() => onDelete(item.id, item.name)}
            >
              <View style={styles.caseRow}>
                <Text style={styles.caseName}>{item.name}</Text>
                {item.risk && (
                  <View style={[styles.badge, { backgroundColor: priorityColor(item.risk.overallPriority) + '33' }]}>
                    <Text style={[styles.badgeText, { color: priorityColor(item.risk.overallPriority) }]}>
                      {item.risk.overallPriority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.caseDate}>
                {new Date(item.savedAt).toLocaleDateString()} ·{' '}
                {item.leInteractions.length > 0 ? `${item.leInteractions.length} LE interaction(s)` : 'No LE log'}
              </Text>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => loadAllCases().then(setCases)} />}
        />
      )}

      <TouchableOpacity onPress={() => nav.navigate('Settings')} style={styles.settingsLink}>
        <Text style={styles.settingsLinkText}>Settings / Update Gemma Token</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>Long-press a case to delete · Tap to open</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  header:      { alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.md },
  logo:        { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  subtitle:    { color: colors.blueLight, fontSize: 13, fontWeight: '600', marginTop: 4 },
  tagline:     { color: colors.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  newBtn:      { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md,
                 alignItems: 'center', marginBottom: spacing.lg },
  newBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty:       { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  caseCard:    { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                 marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  caseRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseName:    { color: colors.textPrimary, fontWeight: '600', flex: 1 },
  badge:       { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  badgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  caseDate:    { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  settingsLink:     { alignItems: 'center', paddingVertical: spacing.sm },
  settingsLinkText: { color: colors.textMuted, fontSize: 11 },
  footer:      { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.xs },
});
