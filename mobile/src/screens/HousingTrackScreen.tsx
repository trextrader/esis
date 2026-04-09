// mobile/src/screens/HousingTrackScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { HousingTrack } from '../engine/types';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'HousingTrack'>;

export default function HousingTrackScreen() {
  const route = useRoute<Route>();
  const { caseId } = route.params;
  const [track, setTrack] = useState<HousingTrack | null>(null);

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      setTrack(found?.housingTrack ?? null);
    });
  }, [caseId]);

  if (!track) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>No housing track available.</Text>
      </View>
    );
  }

  const scoreColor = track.priorityScore >= 60 ? colors.red
    : track.priorityScore >= 30 ? colors.amber
    : colors.green;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.scoreBanner, { borderColor: scoreColor }]}>
        <Text style={styles.trackName}>{track.trackName}</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{track.priorityScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <Text style={styles.timelineText}>⏱ {track.estimatedTimeline}</Text>
      </View>

      {track.rationale.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Why This Track</Text>
          {track.rationale.map((r, i) => (
            <View key={i} style={styles.rationaleRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.rationaleText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Immediate Actions</Text>
        {track.immediateActions.map((action, i) => (
          <View key={i} style={styles.actionRow}>
            <View style={[styles.actionNum, { backgroundColor: colors.blue }]}>
              <Text style={styles.actionNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Target Programs</Text>
        {track.targetPrograms.map((prog, i) => (
          <View key={i} style={styles.programRow}>
            <Text style={styles.programText}>{prog}</Text>
          </View>
        ))}
      </View>

      {!!track.communityPingMessage && (
        <View style={styles.pingCard}>
          <Text style={styles.sectionLabel}>Community Ping Draft</Text>
          <Text style={styles.pingText}>{track.communityPingMessage}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md },
  scoreBanner:    { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md,
                    borderWidth: 2, marginBottom: spacing.md, alignItems: 'center' },
  trackName:      { color: colors.textPrimary, fontWeight: '800', fontSize: 16,
                    textAlign: 'center', marginBottom: spacing.xs },
  scoreRow:       { flexDirection: 'row', alignItems: 'baseline' },
  scoreNum:       { fontSize: 48, fontWeight: '900' },
  scoreMax:       { fontSize: 18, color: colors.textMuted, marginLeft: 4 },
  timelineText:   { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs, textAlign: 'center' },
  section:        { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  sectionLabel:   { color: colors.textMuted, fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  rationaleRow:   { flexDirection: 'row', marginBottom: 6 },
  bullet:         { color: colors.blueLight, fontWeight: '700', marginRight: 8, fontSize: 16 },
  rationaleText:  { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 20 },
  actionRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  actionNum:      { width: 26, height: 26, borderRadius: 13, alignItems: 'center',
                    justifyContent: 'center', marginRight: spacing.sm, flexShrink: 0 },
  actionNumText:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  actionText:     { color: colors.textPrimary, fontSize: 14, flex: 1, lineHeight: 22 },
  programRow:     { backgroundColor: '#0A1525', borderRadius: 6, padding: spacing.sm,
                    marginBottom: spacing.xs, borderLeftWidth: 2, borderLeftColor: colors.blue },
  programText:    { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  pingCard:       { backgroundColor: '#0D1B2E', borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.purple + '44', marginBottom: spacing.md },
  pingText:       { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
