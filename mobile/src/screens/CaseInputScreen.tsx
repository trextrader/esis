// mobile/src/screens/CaseInputScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing } from '../theme';
import { normalizeCase } from '../engine/intake';
import { scoreRisk } from '../engine/triage';
import { generateGemmaRecommendation, GemmaError } from '../engine/gemma';
import { assignHousingTrack } from '../engine/housing_track';
import { generatePacket } from '../engine/packet';
import { loadAllCases, saveCase, newCaseId } from '../storage/cases';
import { loadSettings } from '../storage/settings';
import { searchLocalServices, formatForPrompt } from '../services/search211';
import { CaseInput, DEFAULT_CASE_INPUT, PersonProfile, DEFAULT_PROFILE, SavedCase } from '../engine/types';
import { CITIES, getCityById } from '../data/cities';
import { RootStackParamList } from '../../App';

type Nav   = StackNavigationProp<RootStackParamList, 'CaseInput'>;
type Route = RouteProp<RootStackParamList, 'CaseInput'>;

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

  const [caseName, setCaseName]         = useState('');
  const [inp, setInp]                   = useState<CaseInput>(DEFAULT_CASE_INPUT);
  const [profile, setProfile]           = useState<PersonProfile>(DEFAULT_PROFILE);
  const [savedCaseData, setSavedCaseData] = useState<SavedCase | null>(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [analyzeStep, setAnalyzeStep]   = useState('');

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

  const toggleProfile = (key: keyof PersonProfile) =>
    setProfile(prev => ({ ...prev, [key]: !(prev[key] as boolean) }));

  const onAnalyze = async () => {
    if (!caseName.trim()) {
      Alert.alert('Name required', 'Enter a name for this case first.');
      return;
    }

    setAnalyzing(true);
    try {
      const settings = await loadSettings();

      setAnalyzeStep('Scoring risk...');
      const structured   = normalizeCase(inp);
      const risk         = scoreRisk(structured);
      const housingTrack = assignHousingTrack(profile, inp.city);

      // Live service search — runs in parallel with housing track, non-blocking
      setAnalyzeStep('Searching live local services...');
      const city = getCityById(inp.city);
      const liveServices = await searchLocalServices(
        city.name, city.state, structured.riskDomains, settings.serperApiKey,
      );
      const liveServicesBlock = formatForPrompt(liveServices);

      setAnalyzeStep('Gemma 4 generating plan...');
      let recommendation;
      try {
        recommendation = await generateGemmaRecommendation(
          structured, risk, settings.hfToken, settings.gemmaModel,
          inp.city, liveServicesBlock, profile, housingTrack,
        );
      } catch (err) {
        setAnalyzing(false);
        setAnalyzeStep('');
        if (err instanceof GemmaError) {
          Alert.alert('Gemma 4 Error', err.message, [
            { text: 'Go to Settings', onPress: () => nav.navigate('Settings') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        } else {
          Alert.alert('Error', 'Unexpected error. Please try again.');
        }
        return;
      }

      const packet = generatePacket(structured, risk, recommendation);
      const id     = savedCaseData?.id ?? newCaseId();

      const toSave: SavedCase = {
        id,
        name: caseName.trim(),
        savedAt: new Date().toISOString(),
        input: inp,
        profile,
        risk,
        recommendation,
        housingTrack,
        packet,
        leInteractions: savedCaseData?.leInteractions ?? [],
      };
      await saveCase(toSave);
      setAnalyzeStep('');
      nav.navigate('Risk', { caseId: id, risk });
    } finally {
      setAnalyzing(false);
      setAnalyzeStep('');
    }
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

      {section('City')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}
        contentContainerStyle={styles.cityScrollContent}>
        {CITIES.map(city => {
          const selected = inp.city === city.id;
          return (
            <TouchableOpacity
              key={city.id}
              style={[styles.cityChip, selected && styles.cityChipSelected]}
              onPress={() => setInp(p => ({ ...p, city: city.id }))}
            >
              <Text style={[styles.cityChipText, selected && styles.cityChipTextSelected]}>
                {city.name}
              </Text>
              <Text style={[styles.cityChipState, selected && styles.cityChipTextSelected]}>
                {city.state}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
      <CheckRow label="Recent police interaction"           value={inp.hasPoliceContact}              onToggle={() => toggle('hasPoliceContact')} />
      <CheckRow label="Told to leave / displaced"           value={inp.wasDisplaced}                  onToggle={() => toggle('wasDisplaced')} />
      <CheckRow label="Threatened with arrest"              value={inp.wasThreatenedWithArrest}       onToggle={() => toggle('wasThreatenedWithArrest')} />
      <CheckRow label="Lost belongings during interaction"  value={inp.lostBelongingsDueToInteraction} onToggle={() => toggle('lostBelongingsDueToInteraction')} />

      {section('Profile (for Housing Track)')}
      <CheckRow label="Has a disability"                    value={profile.isDisabled}                   onToggle={() => toggleProfile('isDisabled')} />
      <CheckRow label="Woman with minor children"           value={profile.isWomanWithMinorChildren}     onToggle={() => toggleProfile('isWomanWithMinorChildren')} />
      <CheckRow label="Life-threatening medical condition"  value={profile.hasLifeThreateningCondition}  onToggle={() => toggleProfile('hasLifeThreateningCondition')} />
      <CheckRow label="Currently employed"                  value={profile.hasEmployment}                onToggle={() => toggleProfile('hasEmployment')} />
      <CheckRow label="Substance use disorder"              value={profile.isKnownSubstanceUser}         onToggle={() => toggleProfile('isKnownSubstanceUser')} />
      <CheckRow label="Age 50+"                             value={profile.isElderly}                    onToggle={() => toggleProfile('isElderly')} />
      <CheckRow label="Consent to community ping"           value={profile.consentCommunityPing}         onToggle={() => toggleProfile('consentCommunityPing')} />

      <TextInput
        style={styles.input}
        placeholder="Months homeless (e.g. 14)"
        placeholderTextColor={colors.textMuted}
        value={profile.monthsHomeless > 0 ? String(profile.monthsHomeless) : ''}
        onChangeText={v => setProfile(p => ({ ...p, monthsHomeless: parseInt(v) || 0 }))}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Education level (hs / trade / associates / bachelors / masters / phd)"
        placeholderTextColor={colors.textMuted}
        value={profile.educationLevel}
        onChangeText={v => setProfile(p => ({ ...p, educationLevel: v }))}
        autoCapitalize="none"
      />
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
        placeholder="Contact phone"
        placeholderTextColor={colors.textMuted}
        value={profile.contactPhone}
        onChangeText={v => setProfile(p => ({ ...p, contactPhone: v }))}
        keyboardType="phone-pad"
      />

      <TouchableOpacity
        style={[styles.analyzeBtn, analyzing && { opacity: 0.7 }]}
        onPress={onAnalyze}
        disabled={analyzing}
      >
        {analyzing
          ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.analyzeBtnText}>{analyzeStep || 'Analyzing...'}</Text>
            </View>
          )
          : <Text style={styles.analyzeBtnText}>Analyze with ESIS + Gemma 4</Text>
        }
      </TouchableOpacity>

      {savedCaseData && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => nav.navigate('LELog', { caseId: savedCaseData.id })}
        >
          <Text style={styles.secondaryBtnText}>
            Police Interaction Log
            {savedCaseData.leInteractions.length > 0
              ? ` (${savedCaseData.leInteractions.length})`
              : ''}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.settingsBtn} onPress={() => nav.navigate('Settings')}>
        <Text style={styles.settingsBtnText}>Settings / Update Token</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.bg },
  content:           { padding: spacing.md },
  sectionTitle:      { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                       textTransform: 'uppercase', letterSpacing: 0.8,
                       marginTop: spacing.lg, marginBottom: spacing.xs },
  nameInput:         { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                       color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                       marginBottom: spacing.sm, fontSize: 15 },
  textArea:          { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                       color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                       minHeight: 120, fontSize: 14 },
  input:             { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                       color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                       marginTop: spacing.sm, fontSize: 14 },
  enforcementBanner: { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.blue + '44',
                       borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  enforcementText:   { color: colors.blueLight, fontSize: 12, lineHeight: 18 },
  analyzeBtn:        { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                       alignItems: 'center', marginTop: spacing.lg },
  analyzeBtnText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn:      { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                       padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  secondaryBtnText:  { color: colors.textSecondary, fontSize: 14 },
  cityScroll:            { marginBottom: spacing.sm },
  cityScrollContent:     { paddingVertical: spacing.xs },
  cityChip:              { borderWidth: 1, borderColor: colors.border, borderRadius: 20,
                           paddingHorizontal: 14, paddingVertical: 7, marginRight: spacing.xs,
                           backgroundColor: colors.card, alignItems: 'center' },
  cityChipSelected:      { backgroundColor: colors.blue, borderColor: colors.blue },
  cityChipText:          { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  cityChipState:         { color: colors.textMuted, fontSize: 10 },
  cityChipTextSelected:  { color: '#fff' },
  settingsBtn:       { padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  settingsBtnText:   { color: colors.textMuted, fontSize: 12 },
});
