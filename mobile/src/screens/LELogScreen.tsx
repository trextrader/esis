// mobile/src/screens/LELogScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases, saveCase } from '../storage/cases';
import { LEInteraction, SavedCase } from '../engine/types';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'LELog'>;

const ENCOUNTER_TYPES = [
  { key: 'no_action',           label: 'No action taken' },
  { key: 'welfare_check',       label: 'Welfare check' },
  { key: 'displacement_order',  label: 'Displacement / told to leave' },
  { key: 'trespass_warning',    label: 'Trespass warning' },
  { key: 'citation',            label: 'Citation / ticket' },
  { key: 'arrest',              label: 'Arrest' },
  { key: 'property_removal',    label: 'Property removed / confiscated' },
  { key: 'transport_offer',     label: 'Transport offered' },
  { key: 'referral_offer',      label: 'Referral / resource offered' },
];

const OUTCOMES = [
  { key: 'unchanged',           label: 'Unchanged' },
  { key: 'safer',               label: 'Safer — interaction helped' },
  { key: 'higher_exposure_risk',label: 'Higher exposure risk' },
  { key: 'higher_medical_risk', label: 'Higher medical risk' },
  { key: 'jailed',              label: 'Arrested / jailed' },
  { key: 'disconnected',        label: 'Disconnected from pathway' },
  { key: 'referred_to_support', label: 'Referred into support network' },
];

function Picker({ options, value, onChange }: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
      {options.map(o => (
        <TouchableOpacity
          key={o.key}
          style={[
            pickerStyles.chip,
            value === o.key && pickerStyles.chipSelected,
          ]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[pickerStyles.chipText, value === o.key && { color: '#fff' }]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const pickerStyles = StyleSheet.create({
  chip:         { backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14,
                  paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText:     { color: colors.textSecondary, fontSize: 13 },
});

export default function LELogScreen() {
  const route  = useRoute<Route>();
  const caseId = route.params.caseId;

  const [savedCase, setSavedCase] = useState<SavedCase | null>(null);
  const [date,      setDate]      = useState('');
  const [time,      setTime]      = useState('');
  const [location,  setLocation]  = useState('');
  const [agency,    setAgency]    = useState('');
  const [badge,     setBadge]     = useState('');
  const [encounter, setEncounter] = useState('no_action');
  const [outcome,   setOutcome]   = useState('unchanged');
  const [narrative, setNarrative] = useState('');
  const [harm,      setHarm]      = useState('');

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      if (found) setSavedCase(found);
    });
  }, [caseId]);

  const onLog = async () => {
    if (!savedCase) return;
    const interaction: LEInteraction = {
      id: Date.now().toString(36),
      loggedAt: new Date().toISOString(),
      incidentDate: date,
      incidentTime: time,
      locationDescription: location,
      agency,
      badgeOrDescription: badge,
      officerCount: 1,
      encounterType: encounter,
      officerResponseProfile: 'neutral',
      conditionAtEncounter: [],
      resourceActions: ['no_resources_offered'],
      disruptionIndicators: [],
      whatHappened: narrative,
      outcome,
      witnesses: '',
      injuriesOrHarm: harm,
    };
    const updated: SavedCase = {
      ...savedCase,
      leInteractions: [...savedCase.leInteractions, interaction],
    };
    await saveCase(updated);
    setSavedCase(updated);
    setDate(''); setTime(''); setLocation(''); setAgency('');
    setBadge(''); setNarrative(''); setHarm('');
    setEncounter('no_action'); setOutcome('unchanged');
    Alert.alert('Logged', `Interaction recorded (ID: ${interaction.id}). Re-analyze to update risk scores.`);
  };

  const onDelete = async (id: string) => {
    if (!savedCase) return;
    Alert.alert('Remove', 'Remove this interaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const updated = { ...savedCase, leInteractions: savedCase.leInteractions.filter(x => x.id !== id) };
          await saveCase(updated);
          setSavedCase(updated);
        },
      },
    ]);
  };

  const interactions = savedCase?.leInteractions ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Transparency & Accountability</Text>
        <Text style={styles.bannerBody}>
          Every logged interaction is part of your ESIS record and shared with
          case managers, outreach teams, HUD, and medical staff. Enforcement-driven
          harm adjusts your risk scores automatically.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Log a New Interaction</Text>

      <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)"
        placeholderTextColor={colors.textMuted} value={date} onChangeText={setDate} />
      <TextInput style={styles.input} placeholder="Approximate time (e.g. 11:30 PM)"
        placeholderTextColor={colors.textMuted} value={time} onChangeText={setTime} />
      <TextInput style={styles.input} placeholder="Location (intersection, plaza, shelter)"
        placeholderTextColor={colors.textMuted} value={location} onChangeText={setLocation} />
      <TextInput style={styles.input} placeholder="Agency / department"
        placeholderTextColor={colors.textMuted} value={agency} onChangeText={setAgency} />
      <TextInput style={styles.input} placeholder="Badge # or officer description (optional)"
        placeholderTextColor={colors.textMuted} value={badge} onChangeText={setBadge} />

      <Text style={styles.fieldLabel}>Type of encounter</Text>
      <Picker options={ENCOUNTER_TYPES} value={encounter} onChange={setEncounter} />

      <Text style={styles.fieldLabel}>Outcome</Text>
      <Picker options={OUTCOMES} value={outcome} onChange={setOutcome} />

      <TextInput style={[styles.input, styles.textArea]}
        multiline numberOfLines={5} placeholder="What happened — full account"
        placeholderTextColor={colors.textMuted} value={narrative}
        onChangeText={setNarrative} textAlignVertical="top" />
      <TextInput style={styles.input} placeholder="Any injuries or harm caused"
        placeholderTextColor={colors.textMuted} value={harm} onChangeText={setHarm} />

      <TouchableOpacity style={styles.logBtn} onPress={onLog}>
        <Text style={styles.logBtnText}>Log this interaction</Text>
      </TouchableOpacity>

      {interactions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
            {interactions.length} Interaction(s) on Record
          </Text>
          {interactions.map((item, i) => (
            <View key={item.id} style={styles.interactionCard}>
              <Text style={styles.interactionHeader}>
                #{i + 1} · {item.incidentDate || 'Date unknown'} · {item.encounterType} · {item.outcome}
              </Text>
              {item.whatHappened ? (
                <Text style={styles.interactionBody} numberOfLines={3}>{item.whatHappened}</Text>
              ) : null}
              <TouchableOpacity onPress={() => onDelete(item.id)}>
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  content:          { padding: spacing.md },
  banner:           { backgroundColor: '#0D1B2E', borderWidth: 1, borderColor: colors.blue + '44',
                      borderRadius: 10, padding: spacing.md, marginBottom: spacing.md },
  bannerTitle:      { color: colors.blueLight, fontWeight: '700', marginBottom: 4 },
  bannerBody:       { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  sectionTitle:     { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  fieldLabel:       { color: colors.textSecondary, fontSize: 12, marginBottom: 4, marginTop: spacing.sm },
  input:            { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                      color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
                      marginBottom: spacing.sm, fontSize: 14 },
  textArea:         { minHeight: 100 },
  logBtn:           { backgroundColor: colors.blue, borderRadius: 10, padding: spacing.md + 4,
                      alignItems: 'center', marginTop: spacing.sm },
  logBtnText:       { color: '#fff', fontWeight: '700', fontSize: 16 },
  interactionCard:  { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                      borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  interactionHeader:{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  interactionBody:  { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 20 },
  deleteText:       { color: colors.red, fontSize: 12, marginTop: spacing.sm },
});
