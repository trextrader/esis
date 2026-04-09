// mobile/src/screens/CodeBlueScreen.tsx
// Full-distress emergency broadcast.
// One big button — confirms once — then immediately:
//   1. Starts the SOS WiFi ping server (community sees you on the map)
//   2. Presents one-tap call to 911
//   3. Presents one-tap SMS to stored emergency contact
//   4. Shows shareable SOS link + QR code
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Linking, Share, Vibration,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { loadAllCases } from '../storage/cases';
import { SavedCase } from '../engine/types';
import {
  startPingServer, stopPingServer, updateVictimLocation, getHelpers, Helper,
} from '../services/pingServer';
import { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'CodeBlue'>;
type Phase = 'standby' | 'confirming' | 'launching' | 'active';

function buildEmergencyNeeds(c: SavedCase): string {
  const parts: string[] = [];
  if (c.input.hasPain)         parts.push('medical emergency');
  if (c.input.hasExposureRisk) parts.push('exposure risk');
  if (!c.input.hasShelter)     parts.push('no shelter');
  if (c.input.recentDischarge) parts.push('recent hospital discharge');
  if (c.profile.resourceNeeds.length) parts.push(...c.profile.resourceNeeds);
  return parts.length ? parts.join(', ') : 'immediate emergency assistance needed';
}

export default function CodeBlueScreen() {
  const route = useRoute<Route>();
  const nav   = useNavigation();
  const caseId = route.params.caseId;

  const [phase, setPhase]         = useState<Phase>('standby');
  const [savedCase, setSavedCase] = useState<SavedCase | null>(null);
  const [localIp, setLocalIp]     = useState('');
  const [helpers, setHelpers]     = useState<Helper[]>([]);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const pollTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  const url = localIp ? `http://${localIp}:8080` : '';

  useEffect(() => {
    loadAllCases().then(all => {
      const found = all.find(c => c.id === caseId);
      if (found) setSavedCase(found);
    });
    return () => {
      locationSub.current?.remove();
      if (pollTimer.current) clearInterval(pollTimer.current);
      stopPingServer();
    };
  }, [caseId]);

  useEffect(() => {
    if (phase === 'active') {
      pollTimer.current = setInterval(() => setHelpers(getHelpers()), 2000);
    }
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [phase]);

  const onPressCodeBlue = () => {
    Vibration.vibrate(200);
    setPhase('confirming');
  };

  const onCancel = () => {
    Vibration.cancel();
    setPhase('standby');
  };

  const onConfirm = async () => {
    if (!savedCase) return;
    setPhase('launching');
    Vibration.vibrate([0, 100, 100, 100, 100, 300]);

    // Location
    const { status } = await Location.requestForegroundPermissionsAsync();
    let lat = 0, lng = 0;
    if (status === 'granted') {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch { /* proceed without GPS */ }
    }

    // WiFi IP
    let ip = '';
    try { ip = await Network.getIpAddressAsync(); } catch { ip = ''; }
    if (ip && ip !== '0.0.0.0') setLocalIp(ip);

    const needs    = buildEmergencyNeeds(savedCase);
    const priority = savedCase.risk?.overallPriority ?? 'high';

    // Start SOS ping server
    startPingServer({
      victimNeeds:    needs,
      victimPriority: priority,
      initialLat:     lat,
      initialLng:     lng,
    });

    if (status === 'granted') {
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (l) => updateVictimLocation(l.coords.latitude, l.coords.longitude),
      );
    }

    setPhase('active');
  };

  const onCall911 = () => Linking.openURL('tel:911');

  const onSMSEmergencyContact = () => {
    if (!savedCase) return;
    const contact = savedCase.profile.contactPhone || savedCase.profile.contactEmail;
    const body    = encodeURIComponent(
      `CODE BLUE — ESIS EMERGENCY ALERT\n\nThis person needs immediate help.\nNeeds: ${buildEmergencyNeeds(savedCase)}\n` +
      (url ? `Live location: ${url}\n` : '') +
      `Case: ${savedCase.name}`
    );
    if (savedCase.profile.contactPhone) {
      Linking.openURL(`sms:${savedCase.profile.contactPhone}?body=${body}`);
    } else {
      Alert.alert('No contact saved', 'No emergency contact phone number is saved in this case profile.');
    }
  };

  const onShare = async () => {
    if (!savedCase) return;
    const msg =
      `🚨 CODE BLUE — ESIS EMERGENCY 🚨\n\n` +
      `Someone nearby needs IMMEDIATE help.\n` +
      `Needs: ${buildEmergencyNeeds(savedCase)}\n` +
      (url ? `Open this link to see live location and respond:\n${url}\n` : '') +
      `\nRespond NOW — every second counts.`;
    try {
      await Share.share({ message: msg, url: url || undefined });
    } catch { /* ignore */ }
  };

  // ── Standby ─────────────────────────────────────────────────────────────────

  if (phase === 'standby') {
    return (
      <View style={styles.screen}>
        <View style={styles.topSection}>
          <Text style={styles.headerLabel}>EMERGENCY DISTRESS SIGNAL</Text>
          <Text style={styles.headerSub}>
            Press only if you are in immediate danger and cannot call for help.
            This will alert emergency services, case management, and the surrounding community.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.codeBlueBtn}
          onPress={onPressCodeBlue}
          activeOpacity={0.8}
        >
          <Text style={styles.codeBlueBtnText}>CODE BLUE</Text>
          <Text style={styles.codeBlueBtnSub}>TAP TO ACTIVATE</Text>
        </TouchableOpacity>

        <View style={styles.bottomNote}>
          <Text style={styles.noteText}>
            Requires WiFi for community alert. 911 call does not require WiFi.
          </Text>
        </View>
      </View>
    );
  }

  // ── Confirming ───────────────────────────────────────────────────────────────

  if (phase === 'confirming') {
    return (
      <View style={styles.screen}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>ARE YOU SURE?</Text>
          <Text style={styles.confirmBody}>
            This will immediately:
          </Text>
          <Text style={styles.confirmBullet}>• Start a live SOS broadcast on this WiFi</Text>
          <Text style={styles.confirmBullet}>• Show your location to nearby helpers</Text>
          <Text style={styles.confirmBullet}>• Prepare 911 and emergency SMS for one tap</Text>
          <Text style={styles.confirmBullet}>• Send distress to anyone who opens your link</Text>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
          <Text style={styles.confirmBtnText}>SEND CODE BLUE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel — I'm OK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Launching ────────────────────────────────────────────────────────────────

  if (phase === 'launching') {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={styles.launchingText}>Activating emergency broadcast...</Text>
      </View>
    );
  }

  // ── Active ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <View style={styles.activeBanner}>
        <View style={styles.activePulse} />
        <Text style={styles.activeBannerText}>CODE BLUE ACTIVE</Text>
      </View>

      <Text style={styles.activeSubtext}>
        {helpers.length > 0
          ? `${helpers.length} person${helpers.length > 1 ? 's' : ''} responding`
          : 'Waiting for response — share the link below'}
      </Text>

      {/* Emergency actions — prominent */}
      <TouchableOpacity style={styles.call911Btn} onPress={onCall911}>
        <Text style={styles.call911Text}>📞  CALL 911</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.smsBtn} onPress={onSMSEmergencyContact}>
        <Text style={styles.smsBtnText}>✉  SMS Emergency Contact</Text>
      </TouchableOpacity>

      {url ? (
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>Live SOS link — share or scan</Text>
          <Text style={styles.urlText}>{url}</Text>
          <View style={styles.qrWrapper}>
            <QRCode
              value={url}
              size={180}
              backgroundColor="#0A0A18"
              color="#60A5FA"
            />
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
            <Text style={styles.shareBtnText}>Share Emergency Alert</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noWifiCard}>
          <Text style={styles.noWifiText}>
            WiFi not available — community ping is offline.{'\n'}
            Use 911 call or SMS above.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.endBtn} onPress={() => {
        Alert.alert('End Code Blue', 'Are you safe? This will stop the emergency broadcast.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, I am safe — End', onPress: () => {
            stopPingServer();
            locationSub.current?.remove();
            nav.goBack();
          }},
        ]);
      }}>
        <Text style={styles.endBtnText}>I Am Safe — End Code Blue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#04050F', padding: spacing.md,
                      alignItems: 'center', justifyContent: 'center' },
  topSection:       { alignItems: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  headerLabel:      { color: '#60A5FA', fontWeight: '800', fontSize: 13,
                      letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.sm },
  headerSub:        { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Standby button — the main event
  codeBlueBtn:      { width: 220, height: 220, borderRadius: 110,
                      backgroundColor: '#1565C0',
                      borderWidth: 6, borderColor: '#42A5F5',
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#1565C0', shadowRadius: 40, shadowOpacity: 0.8,
                      elevation: 20, marginBottom: spacing.xl },
  codeBlueBtnText:  { color: '#fff', fontWeight: '900', fontSize: 28, letterSpacing: 2 },
  codeBlueBtnSub:   { color: '#90CAF9', fontSize: 11, letterSpacing: 1.5, marginTop: 4 },
  bottomNote:       { paddingHorizontal: spacing.xl },
  noteText:         { color: colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 18 },

  // Confirm
  confirmBox:       { backgroundColor: '#0D1B2E', borderRadius: 12, padding: spacing.lg,
                      borderWidth: 1, borderColor: '#1E3A5F', marginBottom: spacing.lg,
                      width: '100%' },
  confirmTitle:     { color: '#EF4444', fontWeight: '900', fontSize: 22, textAlign: 'center',
                      marginBottom: spacing.md, letterSpacing: 1 },
  confirmBody:      { color: colors.textPrimary, fontSize: 14, marginBottom: spacing.sm },
  confirmBullet:    { color: colors.textSecondary, fontSize: 13, lineHeight: 24, marginLeft: 4 },
  confirmBtn:       { backgroundColor: '#EF4444', borderRadius: 12, padding: spacing.md + 6,
                      alignItems: 'center', width: '100%', marginBottom: spacing.sm },
  confirmBtnText:   { color: '#fff', fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  cancelBtn:        { padding: spacing.md, alignItems: 'center' },
  cancelBtnText:    { color: colors.textMuted, fontSize: 14 },

  // Launching
  launchingText:    { color: colors.textSecondary, fontSize: 15, marginTop: spacing.md },

  // Active
  activeBanner:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A1845',
                      borderWidth: 2, borderColor: '#1565C0', borderRadius: 10,
                      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
                      marginBottom: spacing.sm, width: '100%', justifyContent: 'center' },
  activePulse:      { width: 12, height: 12, borderRadius: 6, backgroundColor: '#42A5F5',
                      marginRight: spacing.sm },
  activeBannerText: { color: '#60A5FA', fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },
  activeSubtext:    { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.md,
                      textAlign: 'center' },

  call911Btn:       { backgroundColor: '#EF4444', borderRadius: 12, padding: spacing.md + 4,
                      alignItems: 'center', width: '100%', marginBottom: spacing.sm },
  call911Text:      { color: '#fff', fontWeight: '900', fontSize: 20, letterSpacing: 0.5 },
  smsBtn:           { borderWidth: 1, borderColor: '#1565C0', borderRadius: 10,
                      padding: spacing.md, alignItems: 'center', width: '100%',
                      marginBottom: spacing.md, backgroundColor: '#0A1845' },
  smsBtnText:       { color: '#60A5FA', fontWeight: '700', fontSize: 16 },

  qrSection:        { alignItems: 'center', width: '100%', marginBottom: spacing.md },
  qrLabel:          { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: 0.8, marginBottom: 4 },
  urlText:          { color: '#60A5FA', fontWeight: '700', fontSize: 14, marginBottom: spacing.sm },
  qrWrapper:        { padding: spacing.sm, backgroundColor: '#0A0A18', borderRadius: 8,
                      borderWidth: 1, borderColor: '#1E3A5F', marginBottom: spacing.sm },
  shareBtn:         { borderWidth: 1, borderColor: '#1565C0', borderRadius: 8,
                      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
                      backgroundColor: '#0A1845' },
  shareBtnText:     { color: '#60A5FA', fontWeight: '700', fontSize: 14 },

  noWifiCard:       { backgroundColor: '#0D1B2E', borderRadius: 8, padding: spacing.md,
                      borderWidth: 1, borderColor: colors.border, width: '100%',
                      marginBottom: spacing.md },
  noWifiText:       { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  endBtn:           { borderWidth: 1, borderColor: colors.green + '44', borderRadius: 10,
                      padding: spacing.md, alignItems: 'center', width: '100%', marginTop: spacing.sm },
  endBtnText:       { color: colors.green, fontSize: 13, fontWeight: '600' },
});
