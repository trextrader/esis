// mobile/src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { colors, spacing } from '../theme';
import { loadSettings, saveSettings, AppSettings } from '../storage/settings';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({ hfToken: '', gemmaModel: 'google/gemma-4-27b-it', tokenSetupComplete: true });
  const [visible, setVisible]   = useState(false);
  const [saving,  setSaving]    = useState(false);

  useEffect(() => { loadSettings().then(setSettings); }, []);

  const onSave = async () => {
    const t = settings.hfToken.trim();
    if (!t) {
      Alert.alert('Token required', 'A HuggingFace token is required for Gemma 4.');
      return;
    }
    if (!t.startsWith('hf_')) {
      Alert.alert('Invalid token', 'HuggingFace tokens start with "hf_".');
      return;
    }
    setSaving(true);
    try {
      const resp = await fetch('https://huggingface.co/api/whoami', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (resp.status === 401) {
        Alert.alert('Token rejected', 'HuggingFace did not accept this token.');
        setSaving(false);
        return;
      }
    } catch { /* network error — save anyway */ }
    await saveSettings({ ...settings, hfToken: t });
    setSaving(false);
    Alert.alert('Saved', 'Settings updated.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Gemma 4 Token</Text>

      <View style={styles.tokenRow}>
        <TextInput
          style={styles.tokenInput}
          placeholder="hf_..."
          placeholderTextColor={colors.textMuted}
          value={settings.hfToken}
          onChangeText={v => setSettings(s => ({ ...s, hfToken: v }))}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setVisible(v => !v)}>
          <Text style={styles.eyeText}>{visible ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Gemma Model</Text>
      <TextInput
        style={styles.input}
        placeholder="google/gemma-4-27b-it"
        placeholderTextColor={colors.textMuted}
        value={settings.gemmaModel}
        onChangeText={v => setSettings(s => ({ ...s, gemmaModel: v }))}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.hint}>Default: google/gemma-4-27b-it. Change only if using a different model.</Text>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyText}>
          🔒 Token stored only on this device. Never sent anywhere except HuggingFace.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Settings</Text>
        }
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  content:      { padding: spacing.md },
  sectionTitle: { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  marginTop: spacing.lg, marginBottom: spacing.xs },
  tokenRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  tokenInput:   { flex: 1, backgroundColor: colors.card, borderRadius: 8,
                  padding: spacing.md, color: colors.textPrimary,
                  borderWidth: 1, borderColor: colors.border, fontSize: 14 },
  eyeBtn:       { padding: spacing.sm, marginLeft: spacing.xs },
  eyeText:      { fontSize: 20 },
  input:        { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                  color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                  fontSize: 14, marginBottom: spacing.xs },
  hint:         { color: colors.textMuted, fontSize: 11, marginBottom: spacing.md },
  privacyCard:  { backgroundColor: '#061A0E', borderRadius: 8, padding: spacing.sm,
                  borderWidth: 1, borderColor: colors.green + '44', marginBottom: spacing.lg,
                  marginTop: spacing.md },
  privacyText:  { color: colors.green, fontSize: 12, lineHeight: 18 },
  saveBtn:      { backgroundColor: colors.blue, borderRadius: 10,
                  padding: spacing.md + 4, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
});
