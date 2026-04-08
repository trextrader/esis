// mobile/src/screens/CaseInputScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { normalizeCase } from '../engine/intake';
import { scoreRisk } from '../engine/triage';
import { generateRecommendation } from '../engine/recommendation';
import { loadAllCases, saveCase, newCaseId } from '../storage/cases';
import { CaseInput, DEFAULT_CASE_INPUT, PersonProfile, DEFAULT_PROFILE, SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Nav  = StackNavigationProp<RootStackParamList, 'CaseInput'>;
type Route= RouteProp<RootStackParamList, 'CaseInput'>;

function CheckRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Switch value={value} onValueChange={onToggle}
        trackColor={{ true: colors.blue, false: colors.border }}
        thumbColor={value ? '#fff' : colors.textMuted} />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
           paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.textPrimary, flex: 1, fontSize: 14 },
});

export default function CaseInputScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const caseId = route.params?.caseId;

  const [caseName, setCaseName]   = useState('');
  const [inp, setInp]             = useState<CaseInput>(DEFAULT_CASE_INPUT);
  const [profile, setProfile]     = useState<PersonProfile>(DEFAULT_PROFILE);
  const [savedCaseData, setSavedCaseData] = useState<SavedCase | null>(null);

  useEffect(() => {
    if (caseId) {
      loadAllCases().then(all => {
        const found = all.find(c => c.id === caseId);
        if (found) {
          setSavedCaseData(found);
          setCaseName(found.name);
          setInp(found.input);
          setProfile(found.profile);
        }
      });
    }
  }, [caseId]);

  const toggle = (key: keyof CaseInput) =>
    setInp(prev => ({ ...prev, [key]: !prev[key] }));

  const onAnalyze = async () => {
    if (!caseName.trim()) {
      Alert.alert('Name required', 'Enter a name for this case first.');
      return;
    }
    const structured   = normalizeCase(inp);
    const risk         = scoreRisk(structured);
    const recommendation = generateRecommendation(structured, risk);
    const id           = savedCaseData?.id ?? newCaseId();
    const toSave: SavedCase = {
      id,
      name: caseName.trim(),
      savedAt: new Date().toISOString(),
      input: inp,
      profile,
      risk,
      recommendation,
      leInteractions: savedCaseData?.leInteractions ?? [],
    };
    await saveCase(toSave);
    nav.navigate('Risk', { caseId: id, risk });
  };

  const section = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        style={styles.nameInput}
        placeholder="Case name (e.g. My Situation — April 2026)"
        placeholderTextColor={colors.textMuted}
        value={caseName}
        onChangeText={setCaseName}
      />

      {section('Situation Description')}
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={5}
        placeholder="Describe the situation in your own words..."
        placeholderTextColor={colors.textMuted}
        value={inp.rawText}
        onChangeText={v => setInp(p => ({ ...p, rawText: v }))}
        textAlignVertical="top"
      />

      {section('Active Conditions')}
      <CheckRow label="Medical pain / instability"        value={inp.hasPain}            onToggle={() => toggle('hasPain')} />
      <CheckRow label="Exposure / cold / heat risk"       value={inp.hasExposureRisk}    onToggle={() => toggle('hasExposureRisk')} />
      <CheckRow label="Has shelter tonight"               value={inp.hasShelter}         onToggle={() => toggle('hasShelter')} />
      <CheckRow label="Lost ID / documents"               value={inp.hasLostDocuments}   onToggle={() => toggle('hasLostDocuments')} />
      <CheckRow label="Phone battery < 20%"               value={inp.lowBattery}         onToggle={() => toggle('lowBattery')} />
      <CheckRow label="No cash / limited funds"           value={inp.lowFunds}           onToggle={() => toggle('lowFunds')} />
      <CheckRow label="No transportation"                 value={inp.noTransport}        onToggle={() => toggle('noTransport')} />
      <CheckRow label="Recent hospital discharge"         value={inp.recentDischarge}    onToggle={() => toggle('recentDischarge')} />
      <CheckRow label="Cannot use congregate shelter"     value={inp.cannotCongregate}   onToggle={() => toggle('cannotCongregate')} />
      <CheckRow label="Chronically homeless (1+ yr)"      value={inp.chronicHomeless}    onToggle={() => toggle('chronicHomeless')} />

      {section('Authority Interaction')}
      <View style={styles.enforcementBanner}>
        <Text style={styles.enforcementText}>
          Police interactions affect risk scores and generate accountability records
          shared with case managers, outreach teams, and HUD.
        </Text>
      </View>
      <CheckRow label="Recent police interaction"         value={inp.hasPoliceContact}              onToggle={() => toggle('hasPoliceContact')} />
      <CheckRow label="Told to leave / displaced"         value={inp.wasDisplaced}                  onToggle={() => toggle('wasDisplaced')} />
      <CheckRow label="Threatened with arrest"            value={inp.wasThreatenedWithArrest}       onToggle={() => toggle('wasThreatenedWithArrest')} />
      <CheckRow label="Lost belongings during interaction" value={inp.lostBelongingsDueToInteraction} onToggle={() => toggle('lostBelongingsDueToInteraction')} />

      {section('Profile (Optional)')}
      <CheckRow label="Has a disability"
        value={profile.isDisabled} onToggle={() => setProfile(p => ({ ...p, isDisabled: !p.isDisabled }))} />
      <TextInput
        style={styles.input}
        placeholder="Professional background (brief)"
        placeholderTextColor={colors.textMuted}
        value={profile.professionalBackground}
        onChangeText={v => setProfile(p => ({ ...p, professionalBackground: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Skills / what you can offer"
        placeholderTextColor={colors.textMuted}
        value={profile.skillsSummary}
        onChangeText={v => setProfile(p => ({ ...p, skillsSummary: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Contact email (for community ping)"
        placeholderTextColor={colors.textMuted}
        value={profile.contactEmail}
        onChangeText={v => setProfile(p => ({ ...p, contactEmail: v }))}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contact phone (for community ping)"
        placeholderTextColor={colors.textMuted}
        value={profile.contactPhone}
        onChangeText={v => setProfile(p => ({ ...p, contactPhone: v }))}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.analyzeBtn} onPress={onAnalyze}>
        <Text style={styles.analyzeBtnText}>🔍  Analyze with ESIS</Text>
      </TouchableOpacity>

      {savedCaseData && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => nav.navigate('LELog', { caseId: savedCaseData.id })}
        >
          <Text style={styles.secondaryBtnText}>
            🚔 Police Interaction Log
            {savedCaseData.leInteractions.length > 0
              ? ` (${savedCaseData.leInteractions.length})`
              : ''}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md },
  sectionTitle:   { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    marginTop: spacing.lg, marginBottom: spacing.xs },
  nameInput:      { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                    marginBottom: spacing.sm, fontSize: 15 },
  textArea:       { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                    minHeight: 120, fontSize: 14 },
  input:          { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                    marginTop: spacing.sm, fontSize: 14 },
  enforcementBanner: { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.blue + '44',
                        borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  enforcementText:   { color: colors.blueLight, fontSize: 12, lineHeight: 18 },
  analyzeBtn:     { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                    alignItems: 'center', marginTop: spacing.lg },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn:   { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14 },
});
