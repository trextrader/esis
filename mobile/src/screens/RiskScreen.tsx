// mobile/src/screens/RiskScreen.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { RootStackParamList } from '../../App';

type Nav   = StackNavigationProp<RootStackParamList, 'Risk'>;
type Route = RouteProp<RootStackParamList, 'Risk'>;

function RiskCard({ label, score, icon }: { label: string; score: number; icon: string }) {
  const pct   = Math.round(score * 100);
  const color = score >= 0.8 ? colors.red : score >= 0.5 ? colors.amber : colors.green;
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>{icon} {label}</Text>
      <Text style={[cardStyles.value, { color }]}>{pct}%</Text>
      <View style={cardStyles.barBg}>
        <View style={[cardStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const cardStyles = StyleSheet.create({
  card:   { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
            borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, flex: 1, margin: 4 },
  label:  { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value:  { fontSize: 28, fontWeight: '800', marginTop: 4 },
  barBg:  { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill:{ height: 6, borderRadius: 3 },
});

export default function RiskScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { caseId, risk } = route.params;

  const onContinue = async () => {
    const all = await loadAllCases();
    const c   = all.find(x => x.id === caseId);
    if (c?.recommendation) {
      nav.navigate('ActionPlan', { caseId, recommendation: c.recommendation });
    }
  };

  const p = risk.overallPriority;
  const escalationBg = p === 'high' ? '#1A0808' : p === 'medium' ? '#1A1200' : '#061A0E';
  const escalationBorder = p === 'high' ? colors.red : p === 'medium' ? colors.amber : colors.green;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.banner, { backgroundColor: escalationBg, borderColor: escalationBorder }]}>
        <Text style={[styles.bannerPriority, { color: escalationBorder }]}>
          {p.toUpperCase()} PRIORITY
        </Text>
        {risk.requiresEscalation && (
          <Text style={styles.bannerSub}>⚠️  Escalation Required — Immediate intervention needed</Text>
        )}
      </View>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <RiskCard label="Medical Risk"      score={risk.medicalRisk}      icon="🩺" />
          <RiskCard label="Exposure Risk"     score={risk.exposureRisk}     icon="🌡️" />
        </View>
        <View style={styles.gridRow}>
          <RiskCard label="Documentation"     score={risk.documentationRisk}icon="📋" />
          <RiskCard label="Enforcement Risk"  score={risk.enforcementRisk}  icon="🚔" />
        </View>
      </View>

      {risk.enforcementRisk >= 0.5 && (
        <View style={styles.enforcementCard}>
          <Text style={styles.enforcementTitle}>🚔 Enforcement Harm Detected</Text>
          <Text style={styles.enforcementBody}>
            Police/law-enforcement contact is contributing to this person's risk score.
            Enforcement risk: {Math.round(risk.enforcementRisk * 100)}% — logged in audit trail.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
        <Text style={styles.continueBtnText}>View Action Plan →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => nav.navigate('LELog', { caseId })}
      >
        <Text style={styles.secondaryBtnText}>🚔 Log Police Interaction</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => nav.navigate('Ping', { caseId })}
      >
        <Text style={styles.secondaryBtnText}>📢 Community Ping</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  content:         { padding: spacing.md },
  banner:          { borderRadius: 10, padding: spacing.md, borderWidth: 1,
                     marginBottom: spacing.md, alignItems: 'center' },
  bannerPriority:  { fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  bannerSub:       { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  grid:            { marginBottom: spacing.sm },
  gridRow:         { flexDirection: 'row' },
  enforcementCard: { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.red + '44',
                     borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  enforcementTitle:{ color: colors.red, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  enforcementBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  continueBtn:     { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                     alignItems: 'center', marginBottom: spacing.sm },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn:    { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                     padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  secondaryBtnText:{ color: colors.textSecondary, fontSize: 14 },
});
