// mobile/src/screens/PingScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'Ping'>;

function buildPingMessage(c: SavedCase): string {
  const p     = c.profile;
  const needs = p.resourceNeeds.length > 0
    ? p.resourceNeeds.join('; ')
    : 'support';
  const bg    = p.professionalBackground || 'background not shared';
  const skills= p.skillsSummary || 'skills not listed';

  const contactLine = p.contactEmail || p.contactPhone
    ? `Reach out: ${[p.contactEmail, p.contactPhone].filter(Boolean).join(' | ')}`
    : 'Contact ESIS operator to connect';

  return (
    `🛟 ESIS COMMUNITY PING — Neighbor Needs Help\n\n` +
    `A person in your community is experiencing homelessness and is asking for support.\n\n` +
    `They need: ${needs}\n\n` +
    `Background: ${bg}\n` +
    `Skills: ${skills}\n\n` +
    `About them: Non-drug user, capable, has been failed by the current system — ` +
    `not a danger to anyone. They deserve stability and a path back.\n\n` +
    `${contactLine}\n\n` +
    `The community complains about homelessness — here is a chance to be part of the solution. ` +
    `One act of kindness can break the cycle.\n\n` +
    `Powered by ESIS | Edge Survival Intelligence System\n` +
    `Post to: Nextdoor · Facebook Groups · LinkedIn · Reddit · Signal/Telegram mutual aid · Church boards`
  );
}

export default function PingScreen() {
  const route  = useRoute<Route>();
  const caseId = route.params.caseId;
  const [savedCase, setSavedCase] = useState<SavedCase | null>(null);
  const [pingText, setPingText]   = useState('');

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      if (found) {
        setSavedCase(found);
        setPingText(buildPingMessage(found));
      }
    });
  }, [caseId]);

  const onShare = async () => {
    try {
      await Share.share({
        message: pingText,
        title: 'ESIS Community Ping',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not open share sheet.');
    }
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(pingText);
    Alert.alert('Copied', 'Ping message copied to clipboard.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>📢 Community Ping</Text>
        <Text style={styles.bannerBody}>
          Share this message to Nextdoor, Facebook Groups, LinkedIn, Reddit, Signal,
          Telegram mutual aid networks, or church boards. The community has resources
          the system doesn't.
        </Text>
      </View>

      <View style={styles.pingCard}>
        <Text style={styles.pingText}>{pingText}</Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
        <Text style={styles.shareBtnText}>Share via App (Nextdoor, Facebook, etc.)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.copyBtn} onPress={onCopy}>
        <Text style={styles.copyBtnText}>Copy to Clipboard</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Tapping "Share" opens your phone's native share sheet — select any app to post.
        The message is pre-formatted and ready to send as-is.
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  content:     { padding: spacing.md },
  banner:      { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.blue + '44',
                 borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  bannerTitle: { color: colors.blueLight, fontWeight: '700', fontSize: 16, marginBottom: 6 },
  bannerBody:  { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  pingCard:    { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                 borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  pingText:    { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  shareBtn:    { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                 alignItems: 'center', marginBottom: spacing.sm },
  shareBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  copyBtn:     { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                 padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  copyBtnText: { color: colors.textSecondary, fontSize: 14 },
  note:        { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
