// mobile/src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../theme';
import { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList, 'Splash'>;

export default function SplashScreen() {
  const nav    = useNavigation<Nav>();
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => nav.replace('Home'));
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Image
          source={require('../../assets/esis_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>ESIS</Text>
        <Text style={styles.subtitle}>Edge Survival Intelligence System</Text>
        <View style={styles.gemmaTag}>
          <Text style={styles.gemmaText}>Powered by Gemma 4</Text>
        </View>
        <Text style={styles.tagline}>Built with lived experience · Offline-first</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  content:   { alignItems: 'center' },
  logo:      { width: 120, height: 120, marginBottom: 20 },
  title:     { color: colors.textPrimary, fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  subtitle:  { color: colors.blueLight, fontSize: 14, fontWeight: '600', marginTop: 4 },
  gemmaTag:  { backgroundColor: '#0D2E1A', borderWidth: 1, borderColor: colors.green + '66',
               borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5, marginTop: 16 },
  gemmaText: { color: colors.green, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  tagline:   { color: colors.textMuted, fontSize: 11, marginTop: 12 },
});
