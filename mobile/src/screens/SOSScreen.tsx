// mobile/src/screens/SOSScreen.tsx
// Real-time crisis ping — starts a local HTTP server on the victim's phone.
// Anyone on the same WiFi opens the shared link/QR in their browser to help.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Share, ActivityIndicator, Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { SavedCase } from '../engine/types';
import {
  startPingServer, stopPingServer, updateVictimLocation,
  getServerState, getHelpers, Helper,
} from '../services/pingServer';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'SOS'>;

type Phase = 'idle' | 'starting' | 'active' | 'stopped';

export default function SOSScreen() {
  const route      = useRoute<Route>();
  const nav        = useNavigation();
  const caseId     = route.params.caseId;

  const [phase, setPhase]       = useState<Phase>('idle');
  const [savedCase, setSavedCase] = useState<SavedCase | null>(null);
  const [localIp, setLocalIp]   = useState('');
  const [helpers, setHelpers]   = useState<Helper[]>([]);
  const [victimCoords, setVictimCoords] = useState<{ lat: number; lng: number } | null>(null);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const pollTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  const url = localIp ? `http://${localIp}:8080` : '';

  // Load case data
  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      if (found) setSavedCase(found);
    });
    return () => cleanup();
  }, [caseId]);

  // Poll server state while active
  useEffect(() => {
    if (phase === 'active') {
      pollTimer.current = setInterval(() => {
        setHelpers(getHelpers());
        const s = getServerState();
        setVictimCoords({ lat: s.victimLat, lng: s.victimLng });
      }, 2000);
    } else {
      if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    }
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [phase]);

  function cleanup() {
    locationSub.current?.remove();
    if (pollTimer.current) clearInterval(pollTimer.current);
    stopPingServer();
  }

  async function onLaunchSOS() {
    if (!savedCase) return;
    setPhase('starting');

    // Location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location needed', 'ESIS needs your location to show helpers where you are.');
      setPhase('idle');
      return;
    }

    // Get current position
    let loc: Location.LocationObject;
    try {
      loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    } catch {
      Alert.alert('Location error', 'Could not get your location. Make sure GPS is on.');
      setPhase('idle');
      return;
    }

    // Get local WiFi IP
    let ip = '';
    try { ip = await Network.getIpAddressAsync(); } catch { ip = ''; }
    if (!ip || ip === '0.0.0.0') {
      Alert.alert('WiFi required', 'Connect to a WiFi network first so helpers can reach you.');
      setPhase('idle');
      return;
    }
    setLocalIp(ip);

    // Build needs string from case
    const needsText = buildNeedsText(savedCase);
    const priority  = savedCase.risk?.overallPriority ?? 'high';

    // Start server
    startPingServer({
      victimNeeds:    needsText,
      victimPriority: priority,
      initialLat:     loc.coords.latitude,
      initialLng:     loc.coords.longitude,
    });

    // Watch location and push updates to server
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
      (newLoc) => {
        updateVictimLocation(newLoc.coords.latitude, newLoc.coords.longitude);
        setVictimCoords({ lat: newLoc.coords.latitude, lng: newLoc.coords.longitude });
      }
    );

    setPhase('active');
  }

  function onStopSOS() {
    Alert.alert('End SOS Ping', 'Stop the session? Helpers will no longer be able to reach you via this link.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session', style: 'destructive',
        onPress: () => { cleanup(); setPhase('stopped'); },
      },
    ]);
  }

  const onShare = async () => {
    if (!url) return;
    try {
      await Share.share({ message: `ESIS SOS — someone nearby needs help. Open this link: ${url}`, url });
    } catch { /* ignore */ }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'idle' || phase === 'starting') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.sosBanner}>
          <Text style={styles.sosTitle}>🆘 Real-Time SOS Ping</Text>
          <Text style={styles.sosSub}>
            Starts a live session on this phone. Share the link or QR code — anyone
            on the same WiFi opens it in their browser and can respond immediately.
            No app required for helpers.
          </Text>
        </View>

        {savedCase && (
          <View style={styles.caseCard}>
            <Text style={styles.caseCardLabel}>Case</Text>
            <Text style={styles.caseCardName}>{savedCase.name}</Text>
            <Text style={styles.caseCardNeeds}>{buildNeedsText(savedCase)}</Text>
          </View>
        )}

        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          <Text style={styles.howStep}>1. Tap Launch — ESIS starts a local web server on this phone</Text>
          <Text style={styles.howStep}>2. Share the link or QR code with anyone nearby</Text>
          <Text style={styles.howStep}>3. Helpers open it in their browser — see your location on a map</Text>
          <Text style={styles.howStep}>4. They tap "I'm coming" — you see them appear on your screen</Text>
          <Text style={styles.howStep}>5. Everyone stays updated in real time, 100% on-network</Text>
        </View>

        <TouchableOpacity
          style={[styles.launchBtn, phase === 'starting' && { opacity: 0.6 }]}
          onPress={onLaunchSOS}
          disabled={phase === 'starting'}
        >
          {phase === 'starting'
            ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.launchBtnText}>Starting...</Text>
              </View>
            : <Text style={styles.launchBtnText}>Launch SOS Session</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  if (phase === 'stopped') {
    return (
      <View style={styles.stoppedContainer}>
        <Text style={styles.stoppedIcon}>✓</Text>
        <Text style={styles.stoppedTitle}>Session Ended</Text>
        <Text style={styles.stoppedSub}>
          {helpers.length > 0
            ? `${helpers.length} helper${helpers.length > 1 ? 's' : ''} responded during this session.`
            : 'Session closed.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Text style={styles.backBtnText}>Back to Action Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.activeBanner}>
        <View style={styles.activeDot} />
        <Text style={styles.activeBannerText}>SOS ACTIVE — Waiting for helpers</Text>
      </View>

      <View style={styles.qrCard}>
        <Text style={styles.qrLabel}>Share this link or scan QR</Text>
        <Text style={styles.urlText} onPress={() => Linking.openURL(url)}>{url}</Text>
        {url ? (
          <View style={styles.qrWrapper}>
            <QRCode
              value={url}
              size={200}
              backgroundColor={colors.card}
              color={colors.textPrimary}
            />
          </View>
        ) : null}
        <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
          <Text style={styles.shareBtnText}>Share Link</Text>
        </TouchableOpacity>
      </View>

      {victimCoords && (
        <View style={styles.coordCard}>
          <Text style={styles.coordLabel}>Your location (updating every 5s)</Text>
          <Text style={styles.coordText}>
            {victimCoords.lat.toFixed(5)}, {victimCoords.lng.toFixed(5)}
          </Text>
        </View>
      )}

      <View style={styles.helpersCard}>
        <Text style={styles.helpersTitle}>
          Helpers Responding ({helpers.length})
        </Text>
        {helpers.length === 0
          ? <Text style={styles.noHelpers}>No one has responded yet — share the link above.</Text>
          : helpers.map((h, i) => (
              <View key={h.id} style={styles.helperRow}>
                <View style={styles.helperDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.helperName}>{h.name}</Text>
                  {h.lat && h.lng
                    ? <Text style={styles.helperCoord}>{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</Text>
                    : <Text style={styles.helperCoord}>Location not shared</Text>
                  }
                </View>
                <Text style={styles.helperTime}>
                  {new Date(h.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
        }
      </View>

      <TouchableOpacity style={styles.stopBtn} onPress={onStopSOS}>
        <Text style={styles.stopBtnText}>End SOS Session</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildNeedsText(c: SavedCase): string {
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

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  content:         { padding: spacing.md },
  sosBanner:       { backgroundColor: '#1A0808', borderWidth: 1, borderColor: colors.red + '66',
                     borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  sosTitle:        { color: colors.red, fontWeight: '800', fontSize: 18, marginBottom: 6 },
  sosSub:          { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  caseCard:        { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                     borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  caseCardLabel:   { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  caseCardName:    { color: colors.textPrimary, fontWeight: '700', fontSize: 15, marginTop: 2 },
  caseCardNeeds:   { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 20 },
  howCard:         { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md,
                     borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  howTitle:        { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                     textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  howStep:         { color: colors.textSecondary, fontSize: 13, lineHeight: 24 },
  launchBtn:       { backgroundColor: colors.red, borderRadius: 12,
                     padding: spacing.md + 6, alignItems: 'center' },
  launchBtnText:   { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.3 },
  stoppedContainer:{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  stoppedIcon:     { fontSize: 48, color: colors.green, marginBottom: spacing.sm },
  stoppedTitle:    { color: colors.textPrimary, fontWeight: '800', fontSize: 22, marginBottom: spacing.sm },
  stoppedSub:      { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
  backBtn:         { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtnText:     { color: colors.textSecondary, fontSize: 14 },
  activeBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A0808',
                     borderWidth: 1, borderColor: colors.red + '66', borderRadius: 10,
                     padding: spacing.sm + 4, marginBottom: spacing.md },
  activeDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red,
                     marginRight: spacing.sm },
  activeBannerText:{ color: colors.red, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  qrCard:          { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md,
                     borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, alignItems: 'center' },
  qrLabel:         { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  urlText:         { color: colors.blueLight, fontWeight: '700', fontSize: 16, marginBottom: spacing.md },
  qrWrapper:       { padding: spacing.sm, backgroundColor: colors.card, borderRadius: 8, marginBottom: spacing.md },
  shareBtn:        { backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  shareBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  coordCard:       { backgroundColor: colors.card, borderRadius: 10, padding: spacing.sm + 4,
                     borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  coordLabel:      { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  coordText:       { color: colors.textSecondary, fontFamily: 'monospace', fontSize: 13, marginTop: 2 },
  helpersCard:     { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md,
                     borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  helpersTitle:    { color: colors.blueLight, fontWeight: '700', fontSize: 13,
                     textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  noHelpers:       { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  helperRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
                     borderBottomWidth: 1, borderBottomColor: colors.border },
  helperDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green,
                     marginRight: spacing.sm, flexShrink: 0 },
  helperName:      { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  helperCoord:     { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 1 },
  helperTime:      { color: colors.textMuted, fontSize: 11 },
  stopBtn:         { borderWidth: 1, borderColor: colors.red + '66', borderRadius: 10,
                     padding: spacing.md, alignItems: 'center' },
  stopBtnText:     { color: colors.red, fontSize: 14, fontWeight: '600' },
});
