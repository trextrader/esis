// mobile/src/screens/ActionPlanScreen.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { RecommendationOutput } from '../engine/types';
import { RootStackParamList } from '../../App';

type Nav   = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ActionPlan'>;

function HorizonBlock({
  label, color, actions,
}: { label: string; color: string; actions: string[] }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[hStyles.horizonLabel, { color }]}>{label}</Text>
      {actions.map((a, i) => (
        <View key={i} style={hStyles.actionRow}>
          <View style={[hStyles.num, { backgroundColor: color }]}>
            <Text style={hStyles.numText}>{i + 1}</Text>
          </View>
          <Text style={hStyles.actionText}>{a}</Text>
        </View>
      ))}
    </View>
  );
}
const hStyles = StyleSheet.create({
  horizonLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: 0.8, marginBottom: spacing.sm },
  actionRow:    { flexDirection: 'row', alignItems: 'flex-start',
                  backgroundColor: colors.card, borderRadius: 8,
                  padding: spacing.sm, marginBottom: spacing.xs,
                  borderWidth: 1, borderColor: colors.border },
  num:          { width: 26, height: 26, borderRadius: 13, alignItems: 'center',
                  justifyContent: 'center', marginRight: spacing.sm, flexShrink: 0 },
  numText:      { color: '#fff', fontWeight: '800', fontSize: 13 },
  actionText:   { color: colors.textPrimary, fontSize: 14, flex: 1, lineHeight: 22 },
});

export default function ActionPlanScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { caseId, recommendation: rec } = route.params;
  const isAcute = rec.immediateActions.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.codeBlueBtn}
        onPress={() => nav.navigate('CodeBlue', { caseId })}
      >
        <Text style={styles.codeBlueBtnText}>CODE BLUE</Text>
        <Text style={styles.codeBlueBtnSub}>Immediate full-distress emergency broadcast</Text>
      </TouchableOpacity>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Situation Summary</Text>
        <Text style={styles.summaryText}>{rec.summary}</Text>
      </View>

      {isAcute ? (
        <>
          <HorizonBlock
            label="Horizon 1 — Do This Now (0–2 hours)"
            color={colors.red}
            actions={rec.immediateActions}
          />
          {rec.stabilizationActions.length > 0 && (
            <HorizonBlock
              label="Horizon 2 — Next 24 Hours"
              color={colors.amber}
              actions={rec.stabilizationActions}
            />
          )}
          {rec.recoveryActions.length > 0 && (
            <HorizonBlock
              label="Horizon 3 — Recovery Track (Days–Weeks)"
              color={colors.green}
              actions={rec.recoveryActions}
            />
          )}
        </>
      ) : (
        <HorizonBlock label="Top Actions" color={colors.blue} actions={rec.topActions} />
      )}

      <View style={styles.fallbackCard}>
        <Text style={styles.fallbackLabel}>Fallback Plan</Text>
        <Text style={styles.fallbackText}>{rec.fallbackPlan}</Text>
      </View>

      {rec.whatToPreserve.length > 0 && (
        <View style={styles.preserveCard}>
          <Text style={styles.preserveLabel}>What to Preserve</Text>
          {rec.whatToPreserve.map((item, i) => (
            <Text key={i} style={styles.preserveItem}>• {item}</Text>
          ))}
        </View>
      )}

      <View style={styles.outputGrid}>
        <TouchableOpacity
          style={styles.outputBtn}
          onPress={() => nav.navigate('Packet', { caseId })}
        >
          <Text style={styles.outputBtnText}>📋 Advocacy Packet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.outputBtn}
          onPress={() => nav.navigate('HousingTrack', { caseId })}
        >
          <Text style={styles.outputBtnText}>🏠 Housing Track</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.sosBtn} onPress={() => nav.navigate('SOS', { caseId })}>
        <Text style={styles.sosBtnText}>🆘  Real-Time SOS Ping</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.pingBtn} onPress={() => nav.navigate('Ping', { caseId })}>
        <Text style={styles.pingBtnText}>📢  Community Ping (Social Media)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => nav.navigate('LELog', { caseId })}
      >
        <Text style={styles.secondaryBtnText}>🚔 Police Interaction Log</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md },
  summaryCard:    { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  summaryLabel:   { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: 0.8, marginBottom: 6 },
  summaryText:    { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  fallbackCard:   { backgroundColor: '#0A1525', borderRadius: 8, padding: spacing.md,
                    borderLeftWidth: 3, borderLeftColor: colors.textMuted,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  fallbackLabel:  { color: colors.textMuted, fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  fallbackText:   { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  preserveCard:   { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  preserveLabel:  { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: 0.8, marginBottom: 6 },
  preserveItem:   { color: colors.textSecondary, fontSize: 13, lineHeight: 22 },
  outputGrid:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  outputBtn:      { flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  outputBtnText:  { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  codeBlueBtn:    { backgroundColor: '#1565C0', borderRadius: 14,
                    padding: spacing.md + 6, alignItems: 'center',
                    marginBottom: spacing.md,
                    borderWidth: 2, borderColor: '#42A5F5',
                    shadowColor: '#1565C0', shadowRadius: 16, shadowOpacity: 0.6, elevation: 10 },
  codeBlueBtnText:{ color: '#fff', fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  codeBlueBtnSub: { color: '#90CAF9', fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  sosBtn:         { backgroundColor: colors.red, borderRadius: 10, padding: spacing.md + 4,
                    alignItems: 'center', marginBottom: spacing.sm },
  sosBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  pingBtn:        { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 2,
                    alignItems: 'center', marginBottom: spacing.sm },
  pingBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn:   { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14 },
});
