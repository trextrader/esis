// mobile/src/screens/EscalatingSOS.tsx
// Tiered escalating SOS ping.
//
// Tier 1 (0–5 min): Sends an SMS alert to the case contact and displays
//   city outreach / crisis numbers for professional responders. The WiFi
//   ping server runs in "professional" mode — helpers see a blue banner.
//
// If no "I'm on my way" response is recorded within 5 minutes, the session
// auto-escalates to Tier 2: full community broadcast with QR code + share.
// The user can also manually escalate at any time.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, ScrollView,
  Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { SavedCase } from '../engine/types';
import { getCityById, DEFAULT_CITY_ID } from '../data/cities';
import {
  getHelpers, Helper, setTier,
  startPingServer, stopPingServer, updateVictimLocation,
} from '../services/pingServer';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'EscalatingSOS'>;

const TIER1_TIMEOUT = 300; // 5 minutes in seconds

type Phase = 'idle' | 'starting' | 'tier1' | 'tier2' | 'stopped';

export default function EscalatingSOS() {
  const route  = useRoute<Route>();
  const nav    = useNavigation();
  const caseId = route.params.caseId;

  const [phase, setPhase]             = useState<Phase>('idle');
  const [savedCase, setSavedCase]     = useState<SavedCase | null>(null);
  const [localIp, setLocalIp]         = useState('');
  const [helpers, setHelpers]         = useState<Helper[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TIER1_TIMEOUT);
  const [tier1Responded, setTier1Responded] = useState(false);

  const locationSub  = useRef<Location.LocationSubscription | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const didEscalate  = useRef(false);

  const url = localIp ? `http://${localIp}:8080` : '';

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      if (found) setSavedCase(found);
    });
    return () => doCleanup();
  }, [caseId]);

  function doCleanup() {
    locationSub.current?.remove();
    if (pollRef.current) clearInterval(pollRef.current);
    if (cdRef.current)   clearInterval(cdRef.current);
    stopPingServer();
  }

  // Poll helpers every 2 s while session is active
  useEffect(() => {
    if (phase === 'tier1' || phase === 'tier2') {
      pollRef.current = setInterval(() => setHelpers(getHelpers()), 2000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase]);

  // Countdown during Tier 1
  useEffect(() => {
    if (phase === 'tier1') {
      cdRef.current = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    } else {
      if (cdRef.current) { clearInterval(cdRef.current); cdRef.current = null; }
    }
    return () => { if (cdRef.current) clearInterval(cdRef.current); };
  }, [phase]);

  // Watch for Tier 1 response or timeout
  useEffect(() => {
    if (phase !== 'tier1') return;

    // Stop countdown if a professional responded
    if (helpers.length > 0 && !tier1Responded) {
      setTier1Responded(true);
      if (cdRef.current) { clearInterval(cdRef.current); cdRef.current = null; }
    }

    // Auto-escalate to Tier 2 when countdown expires with no response
    if (secondsLeft === 0 && helpers.length === 0 && !didEscalate.current) {
      didEscalate.current = true;
      doEscalateToTier2();
    }
  }, [secondsLeft, helpers, phase, tier1Responded]);

  const doEscalateToTier2 = useCallback(() => {
    setTier(2);
    setPhase('tier2');
  }, []);

  // ── Launch session ──────────────────────────────────────────────────────────

  async function onLaunch() {
    if (!savedCase) return;
    setPhase('starting');

    const { status } = await Location.requestForegroundPermissionsAsync();
    let lat = 0, lng = 0;
    if (status === 'granted') {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch { /* proceed without GPS */ }
    }

    let ip = '';
    try { ip = await Network.getIpAddressAsync(); } catch { ip = ''; }
    if (ip && ip !== '0.0.0.0') setLocalIp(ip);

    const needs    = buildNeeds(savedCase);
    const priority = savedCase.risk?.overallPriority ?? 'high';

    startPingServer({ victimNeeds: needs, victimPriority: priority, initialLat: lat, initialLng: lng });

    if (status === 'granted') {
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (l) => updateVictimLocation(l.coords.latitude, l.coords.longitude),
      );
    }

    // Auto-SMS to case contact (Tier 1 outreach)
    const contactPhone = savedCase.profile.contactPhone;
    if (contactPhone) {
      const city = getCityById(savedCase.input.city ?? DEFAULT_CITY_ID);
      const serverLink = ip && ip !== '0.0.0.0' ? `\nLive location (same WiFi): http://${ip}:8080` : '';
      const body = encodeURIComponent(
        `URGENT — ESIS TIER 1 ALERT\n\n` +
        `This person needs professional outreach now.\n` +
        `Needs: ${needs}${serverLink}\n\n` +
        `If you can respond, reply or call immediately.\n` +
        `Outreach: ${city.coordinatedEntry.name} ${city.coordinatedEntry.phone}`
      );
      Linking.openURL(`sms:${contactPhone}?body=${body}`).catch(() => {});
    }

    setPhase('tier1');
  }

  function onStop() {
    Alert.alert('End SOS Session', 'Stop the escalating SOS session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Session', style: 'destructive', onPress: () => { doCleanup(); setPhase('stopped'); } },
    ]);
  }

  function onManualEscalate() {
    Alert.alert(
      'Escalate to Community?',
      'Skip the professional tier and broadcast to the full community now?',
      [
        { text: 'Wait', style: 'cancel' },
        { text: 'Escalate Now', style: 'destructive', onPress: () => {
          didEscalate.current = true;
          doEscalateToTier2();
        }},
      ]
    );
  }

  async function onShare(tier2 = false) {
    if (!savedCase) return;
    const city  = getCityById(savedCase.input.city ?? DEFAULT_CITY_ID);
    const needs = buildNeeds(savedCase);
    const msg   = tier2
      ? `🆘 ESIS SOS — ESCALATED TO COMMUNITY\n\nSomeone nearby needs IMMEDIATE help.\nNeeds: ${needs}\n${url ? `Open to respond:\n${url}\n` : ''}\nRespond NOW — every second counts.`
      : `ESIS TIER 1 ALERT — Professional Response Needed\n\nNeeds: ${needs}\n${url ? `Live status: ${url}\n` : ''}\nOutreach: ${city.coordinatedEntry.name} ${city.coordinatedEntry.phone}`;
    try {
      await Share.share({ message: msg, url: url || undefined });
    } catch { /* ignore */ }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.introBanner}>
          <Text style={s.introTitle}>Escalating SOS Ping</Text>
          <Text style={s.introSub}>
            Sends a Tier 1 alert to your case contact and outreach first.
            If no "I'm on my way" response within 5 minutes, automatically
            escalates to full community broadcast.
          </Text>
        </View>

        <View style={s.tierRow}>
          <View style={[s.tierCard, { borderLeftColor: colors.blueLight }]}>
            <Text style={[s.tierLabel, { color: colors.blueLight }]}>TIER 1 · 0–5 min</Text>
            <Text style={s.tierText}>Professional outreach — case contact SMS + outreach numbers</Text>
          </View>
          <View style={[s.tierCard, { borderLeftColor: colors.amber }]}>
            <Text style={[s.tierLabel, { color: colors.amber }]}>TIER 2 · auto-escalates</Text>
            <Text style={s.tierText}>Full community broadcast — QR code, share link, anyone responds</Text>
          </View>
        </View>

        {savedCase && (
          <View style={s.caseCard}>
            <Text style={s.caseCardLabel}>Case</Text>
            <Text style={s.caseCardName}>{savedCase.name}</Text>
            <Text style={s.caseCardNeeds}>{buildNeeds(savedCase)}</Text>
          </View>
        )}

        <TouchableOpacity style={s.launchBtn} onPress={onLaunch}>
          <Text style={s.launchBtnText}>Launch Escalating SOS</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  if (phase === 'starting') {
    return (
      <View style={s.centerScreen}>
        <ActivityIndicator size="large" color={colors.red} />
        <Text style={s.startingText}>Activating Tier 1 alert...</Text>
      </View>
    );
  }

  if (phase === 'stopped') {
    return (
      <View style={s.centerScreen}>
        <Text style={s.stoppedIcon}>✓</Text>
        <Text style={s.stoppedTitle}>Session Ended</Text>
        <Text style={s.stoppedSub}>
          {helpers.length > 0
            ? `${helpers.length} helper${helpers.length !== 1 ? 's' : ''} responded during this session.`
            : 'Session closed with no responses recorded.'}
        </Text>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
          <Text style={s.backBtnText}>Back to Action Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mm  = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss  = (secondsLeft % 60).toString().padStart(2, '0');
  const city = savedCase ? getCityById(savedCase.input.city ?? DEFAULT_CITY_ID) : null;

  // ── Tier 1 active ───────────────────────────────────────────────────────────

  if (phase === 'tier1') {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={[s.activeBanner, { borderColor: colors.blueLight + '66', backgroundColor: '#060F1A' }]}>
          <View style={[s.activeDot, { backgroundColor: colors.blueLight }]} />
          <Text style={[s.activeBannerText, { color: colors.blueLight }]}>
            TIER 1 ACTIVE — PROFESSIONAL OUTREACH
          </Text>
        </View>

        {tier1Responded ? (
          <View style={[s.countdownCard, { borderColor: colors.green }]}>
            <Text style={[s.countdownLabel, { color: colors.green }]}>Response Received</Text>
            <Text style={[s.countdownBig, { color: colors.green, fontSize: 32 }]}>Help is on the way</Text>
            <Text style={s.countdownSub}>Community escalation cancelled.</Text>
          </View>
        ) : (
          <View style={s.countdownCard}>
            <Text style={s.countdownLabel}>Escalating to community in</Text>
            <Text style={s.countdownBig}>{mm}:{ss}</Text>
            <Text style={s.countdownSub}>unless a professional responds first</Text>
          </View>
        )}

        {city && (
          <View style={s.contactsCard}>
            <Text style={s.contactsTitle}>Professional Contacts</Text>
            <TouchableOpacity
              style={s.contactRow}
              onPress={() => Linking.openURL(`tel:${city.coordinatedEntry.phone}`)}
            >
              <Text style={s.contactName}>{city.coordinatedEntry.name}</Text>
              <Text style={s.contactPhone}>{city.coordinatedEntry.phone} →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.contactRow, { borderBottomWidth: 0 }]}
              onPress={() => Linking.openURL(`tel:${city.crisis.phone}`)}
            >
              <Text style={s.contactName}>{city.crisis.name}</Text>
              <Text style={s.contactPhone}>{city.crisis.phone} →</Text>
            </TouchableOpacity>
          </View>
        )}

        {url ? (
          <View style={s.linkCard}>
            <Text style={s.linkLabel}>Share with outreach worker</Text>
            <Text style={s.linkUrl}>{url}</Text>
            <TouchableOpacity style={s.shareBtn} onPress={() => onShare(false)}>
              <Text style={s.shareBtnText}>Share Alert Link</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={s.helpersCard}>
          <Text style={s.helpersTitle}>Responses ({helpers.length})</Text>
          {helpers.length === 0
            ? <Text style={s.noHelpers}>Waiting for professional response...</Text>
            : helpers.map(h => <HelperRow key={h.id} helper={h} dotColor={colors.blueLight} />)
          }
        </View>

        {!tier1Responded && (
          <TouchableOpacity style={s.escalateBtn} onPress={onManualEscalate}>
            <Text style={s.escalateBtnText}>Escalate Now → Community</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.stopBtn} onPress={onStop}>
          <Text style={s.stopBtnText}>End SOS Session</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // ── Tier 2 active ───────────────────────────────────────────────────────────

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={[s.activeBanner, { borderColor: colors.amber + '66', backgroundColor: '#1A1000' }]}>
        <View style={[s.activeDot, { backgroundColor: colors.amber }]} />
        <Text style={[s.activeBannerText, { color: colors.amber }]}>
          TIER 2 — COMMUNITY BROADCAST
        </Text>
      </View>

      <View style={[s.countdownCard, { borderColor: colors.amber + '66' }]}>
        <Text style={[s.countdownLabel, { color: colors.amber }]}>Auto-escalated — no professional response</Text>
        <Text style={[s.countdownSub, { marginTop: 4 }]}>
          Community broadcast is active. Share the link or QR code below.
        </Text>
      </View>

      {url ? (
        <View style={[s.linkCard, { borderColor: colors.amber + '33', alignItems: 'center' }]}>
          <Text style={s.linkLabel}>Share with community</Text>
          <Text style={s.linkUrl}>{url}</Text>
          <View style={{ marginVertical: spacing.sm }}>
            <QRCode value={url} size={180} backgroundColor={colors.card} color={colors.textPrimary} />
          </View>
          <TouchableOpacity
            style={[s.shareBtn, { backgroundColor: colors.amber }]}
            onPress={() => onShare(true)}
          >
            <Text style={[s.shareBtnText, { color: '#000' }]}>Share Community Alert</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.noWifiCard}>
          <Text style={s.noWifiText}>WiFi unavailable — share manually or call 911.</Text>
          <TouchableOpacity
            style={s.call911Btn}
            onPress={() => Linking.openURL('tel:911')}
          >
            <Text style={s.call911Text}>📞 CALL 911</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.helpersCard}>
        <Text style={s.helpersTitle}>Community Responses ({helpers.length})</Text>
        {helpers.length === 0
          ? <Text style={s.noHelpers}>No responses yet — share the link above.</Text>
          : helpers.map(h => <HelperRow key={h.id} helper={h} dotColor={colors.amber} />)
        }
      </View>

      <TouchableOpacity style={s.stopBtn} onPress={onStop}>
        <Text style={s.stopBtnText}>End SOS Session</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HelperRow({ helper: h, dotColor }: { helper: Helper; dotColor: string }) {
  return (
    <View style={s.helperRow}>
      <View style={[s.helperDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.helperName}>{h.name}</Text>
        {h.message ? <Text style={s.helperMsg}>"{h.message}"</Text> : null}
        {h.lat && h.lng
          ? <Text style={s.helperCoord}>{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</Text>
          : null}
      </View>
      <Text style={s.helperTime}>
        {new Date(h.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNeeds(c: SavedCase): string {
  const parts: string[] = [];
  if (c.input.hasPain)          parts.push('medical pain/instability');
  if (c.input.hasExposureRisk)  parts.push('exposure/cold risk');
  if (!c.input.hasShelter)      parts.push('no shelter tonight');
  if (c.input.hasLostDocuments) parts.push('lost ID/documents');
  if (c.input.recentDischarge)  parts.push('recent hospital discharge');
  if (c.input.wasDisplaced)     parts.push('displaced by enforcement');
  if (c.profile.resourceNeeds.length) parts.push(...c.profile.resourceNeeds);
  return parts.length ? parts.join(', ') : 'needs immediate help';
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md },
  centerScreen:   { flex: 1, backgroundColor: colors.bg, alignItems: 'center',
                    justifyContent: 'center', padding: spacing.xl },

  introBanner:    { backgroundColor: '#1A0808', borderWidth: 1, borderColor: colors.red + '55',
                    borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  introTitle:     { color: colors.red, fontWeight: '800', fontSize: 18, marginBottom: 6 },
  introSub:       { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },

  tierRow:        { gap: spacing.sm, marginBottom: spacing.md },
  tierCard:       { backgroundColor: colors.card, borderRadius: 8, padding: spacing.sm + 2,
                    borderLeftWidth: 3, borderLeftColor: colors.red,
                    borderWidth: 1, borderColor: colors.border },
  tierLabel:      { color: colors.red, fontWeight: '700', fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  tierText:       { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

  caseCard:       { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  caseCardLabel:  { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  caseCardName:   { color: colors.textPrimary, fontWeight: '700', fontSize: 15, marginTop: 2 },
  caseCardNeeds:  { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 20 },

  launchBtn:      { backgroundColor: colors.red, borderRadius: 12,
                    padding: spacing.md + 6, alignItems: 'center' },
  launchBtnText:  { color: '#fff', fontWeight: '800', fontSize: 18 },

  startingText:   { color: colors.textSecondary, fontSize: 15, marginTop: spacing.md },
  stoppedIcon:    { fontSize: 48, color: colors.green, marginBottom: spacing.sm },
  stoppedTitle:   { color: colors.textPrimary, fontWeight: '800', fontSize: 22,
                    marginBottom: spacing.sm },
  stoppedSub:     { color: colors.textSecondary, fontSize: 14, textAlign: 'center',
                    lineHeight: 22, marginBottom: spacing.lg },
  backBtn:        { borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                    paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtnText:    { color: colors.textSecondary, fontSize: 14 },

  activeBanner:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A0808',
                    borderWidth: 1, borderColor: colors.red + '55', borderRadius: 10,
                    padding: spacing.sm + 4, marginBottom: spacing.md },
  activeDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red,
                    marginRight: spacing.sm },
  activeBannerText: { color: colors.red, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },

  countdownCard:  { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md,
                    borderWidth: 2, borderColor: colors.red + '55',
                    alignItems: 'center', marginBottom: spacing.md },
  countdownLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: 0.8, marginBottom: 4 },
  countdownBig:   { color: colors.red, fontWeight: '900', fontSize: 52,
                    fontFamily: 'monospace', letterSpacing: 4 },
  countdownSub:   { color: colors.textMuted, fontSize: 12, marginTop: 4 },

  contactsCard:   { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  contactsTitle:  { color: colors.blueLight, fontWeight: '700', fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  contactRow:     { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactName:    { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  contactPhone:   { color: colors.blueLight, fontSize: 13, marginTop: 2 },

  linkCard:       { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  linkLabel:      { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: 0.8, marginBottom: 6 },
  linkUrl:        { color: colors.blueLight, fontWeight: '700', fontSize: 14,
                    marginBottom: spacing.sm },
  shareBtn:       { backgroundColor: colors.blue, borderRadius: 8,
                    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
                    alignSelf: 'stretch', alignItems: 'center' },
  shareBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  helpersCard:    { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  helpersTitle:   { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  noHelpers:      { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  helperRow:      { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm,
                    borderBottomWidth: 1, borderBottomColor: colors.border },
  helperDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green,
                    marginRight: spacing.sm, marginTop: 4, flexShrink: 0 },
  helperName:     { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  helperMsg:      { color: colors.green, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  helperCoord:    { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 1 },
  helperTime:     { color: colors.textMuted, fontSize: 11 },

  escalateBtn:    { borderWidth: 2, borderColor: colors.amber, borderRadius: 10,
                    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  escalateBtnText:{ color: colors.amber, fontWeight: '700', fontSize: 15 },

  stopBtn:        { borderWidth: 1, borderColor: colors.red + '44', borderRadius: 10,
                    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  stopBtnText:    { color: colors.red, fontSize: 14, fontWeight: '600' },

  noWifiCard:     { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
                    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  noWifiText:     { color: colors.textMuted, fontSize: 13, textAlign: 'center',
                    lineHeight: 20, marginBottom: spacing.sm },
  call911Btn:     { backgroundColor: colors.red, borderRadius: 10,
                    padding: spacing.md, alignItems: 'center' },
  call911Text:    { color: '#fff', fontWeight: '800', fontSize: 18 },
});
