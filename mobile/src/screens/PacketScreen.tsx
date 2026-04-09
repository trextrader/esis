// mobile/src/screens/PacketScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Clipboard, Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { CasePacket } from '../engine/types';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'Packet'>;

function CopyBlock({ label, text }: { label: string; text: string }) {
  const copy = () => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };
  return (
    <View style={blockStyles.card}>
      <View style={blockStyles.header}>
        <Text style={blockStyles.label}>{label}</Text>
        <TouchableOpacity onPress={copy} style={blockStyles.copyBtn}>
          <Text style={blockStyles.copyText}>Copy</Text>
        </TouchableOpacity>
      </View>
      <Text style={blockStyles.body}>{text}</Text>
    </View>
  );
}

const blockStyles = StyleSheet.create({
  card:     { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
              borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: spacing.sm },
  label:    { color: colors.textMuted, fontSize: 10, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 0.8 },
  copyBtn:  { backgroundColor: colors.blue + '22', borderRadius: 6,
              paddingHorizontal: 10, paddingVertical: 3 },
  copyText: { color: colors.blueLight, fontSize: 12, fontWeight: '600' },
  body:     { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});

export default function PacketScreen() {
  const route = useRoute<Route>();
  const { caseId } = route.params;
  const [packet, setPacket] = useState<CasePacket | null>(null);

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      setPacket(found?.packet ?? null);
    });
  }, [caseId]);

  if (!packet) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>No packet available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerLabel}>Case ID</Text>
        <Text style={styles.caseId}>{packet.caseId}</Text>
        <Text style={styles.createdAt}>
          Generated {new Date(packet.createdAt).toLocaleString()}
        </Text>
      </View>

      <CopyBlock label="One-Page Summary" text={packet.onePageSummary} />
      <CopyBlock label="Advocate Script (Phone Call)" text={packet.advocateScript} />
      <CopyBlock label="Referral Handoff Note" text={packet.referralHandoff} />

      {packet.actionTimeline.length > 0 && (
        <View style={styles.timelineCard}>
          <Text style={styles.sectionLabel}>Action Timeline</Text>
          {packet.actionTimeline.map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineNum}>
                <Text style={styles.timelineNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.timelineText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {packet.preservationChecklist.length > 0 && (
        <View style={styles.checklistCard}>
          <Text style={styles.sectionLabel}>Preservation Checklist</Text>
          {packet.preservationChecklist.map((item, i) => (
            <Text key={i} style={styles.checkItem}>☐  {item}</Text>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md },
  headerCard:     { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
                    alignItems: 'center' },
  headerLabel:    { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  caseId:         { color: colors.textPrimary, fontWeight: '800', fontSize: 18, marginTop: 2 },
  createdAt:      { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionLabel:   { color: colors.textMuted, fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  timelineCard:   { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  timelineRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  timelineNum:    { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.blue,
                    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, flexShrink: 0 },
  timelineNumText:{ color: '#fff', fontWeight: '800', fontSize: 12 },
  timelineText:   { color: colors.textPrimary, fontSize: 13, flex: 1, lineHeight: 20 },
  checklistCard:  { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  checkItem:      { color: colors.textSecondary, fontSize: 13, lineHeight: 24 },
});
