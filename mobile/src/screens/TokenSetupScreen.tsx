// mobile/src/screens/TokenSetupScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { saveSettings, loadSettings } from '../storage/settings';
import { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList, 'TokenSetup'>;

export default function TokenSetupScreen() {
  const nav = useNavigation<Nav>();
  const [token, setToken]       = useState('');
  const [visible, setVisible]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const onSave = async () => {
    const t = token.trim();
    if (!t) {
      Alert.alert('Token required', 'Paste your HuggingFace token to continue.');
      return;
    }
    if (!t.startsWith('hf_')) {
      Alert.alert(
        'Invalid token format',
        'HuggingFace tokens start with "hf_". Check your token and try again.',
      );
      return;
    }

    setLoading(true);
    let verified = false;
    try {
      // Attempt validation — fine-grained tokens with inference-only scope may return 401
      // here even when valid, so we save regardless and warn if unverified.
      const resp = await fetch('https://huggingface.co/api/whoami', {
        headers: { Authorization: `Bearer ${t}` },
      });
      verified = resp.ok;
    } catch {
      // Network error — skip validation
    }

    await saveSettings({ hfToken: t, tokenSetupComplete: true });
    setLoading(false);

    if (!verified) {
      Alert.alert(
        'Token saved',
        'Token saved. If Gemma 4 plans are unavailable, check your token at huggingface.co/settings/tokens.',
        [{ text: 'Continue', onPress: () => nav.replace('Home') }],
      );
    } else {
      nav.replace('Home');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.logoRow}>
        <Text style={styles.logo}>🛟 ESIS</Text>
      </View>

      <Text style={styles.heading}>Connect Gemma 4</Text>
      <Text style={styles.sub}>
        ESIS uses Google Gemma 4 via HuggingFace to generate life-saving intervention plans.
        A free HuggingFace account and token are required.
      </Text>

      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>How to get your token</Text>
        <Text style={styles.stepItem}>1. Create a free account at huggingface.co</Text>
        <Text style={styles.stepItem}>2. Go to Settings → Access Tokens</Text>
        <Text style={styles.stepItem}>3. Create a token with <Text style={styles.bold}>Read</Text> permission</Text>
        <Text style={styles.stepItem}>4. Request access to <Text style={styles.bold}>google/gemma-4-27b-it</Text> on the model page</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://huggingface.co/settings/tokens')}
        >
          <Text style={styles.link}>Open HuggingFace Tokens →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Paste your HuggingFace token</Text>
      <View style={styles.tokenRow}>
        <TextInput
          style={styles.tokenInput}
          placeholder="hf_..."
          placeholderTextColor={colors.textMuted}
          value={token}
          onChangeText={setToken}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setVisible(v => !v)}>
          <Text style={styles.eyeText}>{visible ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyText}>
          🔒 Your token is stored only on this device in encrypted local storage.
          It is never sent to any server other than HuggingFace.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, loading && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Token & Continue →</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  content:      { padding: spacing.md },
  logoRow:      { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  logo:         { fontSize: 40, fontWeight: '800', color: colors.textPrimary },
  heading:      { color: colors.textPrimary, fontSize: 22, fontWeight: '800',
                  textAlign: 'center', marginBottom: spacing.sm },
  sub:          { color: colors.textSecondary, fontSize: 14, lineHeight: 22,
                  textAlign: 'center', marginBottom: spacing.lg },
  stepCard:     { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                  borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  stepTitle:    { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  stepItem:     { color: colors.textSecondary, fontSize: 14, lineHeight: 24 },
  bold:         { color: colors.textPrimary, fontWeight: '700' },
  link:         { color: colors.blue, fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  inputLabel:   { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase',
                  letterSpacing: 0.8, marginBottom: spacing.xs },
  tokenRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  tokenInput:   { flex: 1, backgroundColor: colors.card, borderRadius: 8,
                  padding: spacing.md, color: colors.textPrimary,
                  borderWidth: 1, borderColor: colors.border, fontSize: 14 },
  eyeBtn:       { padding: spacing.sm, marginLeft: spacing.xs },
  eyeText:      { fontSize: 20 },
  privacyCard:  { backgroundColor: '#061A0E', borderRadius: 8, padding: spacing.sm,
                  borderWidth: 1, borderColor: colors.green + '44', marginBottom: spacing.lg },
  privacyText:  { color: colors.green, fontSize: 12, lineHeight: 18 },
  saveBtn:      { backgroundColor: colors.blue, borderRadius: 10,
                  padding: spacing.md + 4, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
});
