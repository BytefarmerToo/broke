import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
  AppState,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { ProfilePicker } from '../components/ProfilePicker';
import { ProfileForm } from '../components/ProfileForm';
import { SettingsModal } from '../components/SettingsModal';
import { CircularProgress } from '../components/CircularProgress';
import { initNfc, readNfcTag, writeNfcTag, cleanupNfc } from '../utils/nfc';
import { Profile } from '../types/Profile';

const COLORS = {
  blocking: '#ef4444',
  notBlocking: '#22c55e',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BrockerView() {
  const {
    isBlocking,
    toggleBlocking,
    currentProfile,
    isLoading,
    accessibilityEnabled,
    checkAccessibility,
    openAccessibilitySettings,
    activeScheduleProfile,
    scheduleEnabled,
    lockHoldDuration,
    unlockHoldDuration,
  } = useApp();

  const [nfcSupported, setNfcSupported] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [buttonScale] = useState(new Animated.Value(1));
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    initNfc().then(setNfcSupported);
    return () => cleanupNfc();
  }, []);

  // Clean up hold interval on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  const currentHoldDuration = isBlocking ? unlockHoldDuration : lockHoldDuration;

  const stopHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartTimeRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const startHold = useCallback(() => {
    if (!currentProfile) {
      Alert.alert('No Profile', 'Please select a profile first');
      return;
    }

    if (Platform.OS === 'android' && !accessibilityEnabled) {
      Alert.alert(
        'Accessibility Required',
        'Broke needs Accessibility Service permission to block apps. Would you like to enable it now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: openAccessibilitySettings,
          },
        ]
      );
      return;
    }

    setIsHolding(true);
    holdStartTimeRef.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updateInterval = 50; // Update every 50ms for smooth animation
    holdIntervalRef.current = setInterval(() => {
      if (!holdStartTimeRef.current) return;

      const elapsed = (Date.now() - holdStartTimeRef.current) / 1000;
      const progress = Math.min(elapsed / currentHoldDuration, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        stopHold();
        handleToggleComplete();
      }
    }, updateInterval);
  }, [currentProfile, accessibilityEnabled, currentHoldDuration, openAccessibilitySettings, stopHold]);

  const handleToggleComplete = async () => {
    Haptics.notificationAsync(
      isBlocking
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );

    animateButton();

    if (!nfcSupported) {
      await toggleBlocking();
      return;
    }

    setIsScanning(true);

    try {
      const result = await readNfcTag();

      if (!result.success) {
        if (!result.message?.includes('cancelled')) {
          Alert.alert('NFC Error', result.message);
        }
        return;
      }

      if (result.isValid) {
        await toggleBlocking();
      } else {
        Alert.alert('Invalid Tag', 'This is not a Broke tag. Use the + button to create one.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Re-check accessibility when app comes to foreground
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAccessibility();
      }
    });

    return () => subscription.remove();
  }, [checkAccessibility]);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleWriteTag = async () => {
    Alert.alert(
      'Create Broke Tag',
      'Hold your phone near an NFC tag to write the Broke signature.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Write Tag',
          onPress: async () => {
            setIsScanning(true);
            try {
              const result = await writeNfcTag();
              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert(result.success ? 'Success' : 'Error', result.message);
            } finally {
              setIsScanning(false);
            }
          },
        },
      ]
    );
  };

  const handleNewProfile = () => {
    setEditingProfile(null);
    setShowProfileForm(true);
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setShowProfileForm(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.notBlocking }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const buttonHeight = isBlocking ? SCREEN_HEIGHT * 0.65 : SCREEN_HEIGHT * 0.35;
  const backgroundColor = isBlocking ? COLORS.blocking : COLORS.notBlocking;
  const showAccessibilityWarning = Platform.OS === 'android' && !accessibilityEnabled;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { backgroundColor }]}>
        <Text style={styles.headerTitle}>Broke</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
          {nfcSupported && (
            <TouchableOpacity onPress={handleWriteTag} style={styles.headerButton}>
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showAccessibilityWarning && (
        <TouchableOpacity
          style={styles.accessibilityBanner}
          onPress={openAccessibilitySettings}
        >
          <Ionicons name="warning" size={20} color="#92400e" />
          <Text style={styles.accessibilityBannerText}>
            Tap to enable Accessibility Service for app blocking
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#92400e" />
        </TouchableOpacity>
      )}

      <Animated.View
        style={[
          styles.toggleContainer,
          {
            height: buttonHeight,
            backgroundColor,
            transform: [{ scale: buttonScale }],
          },
        ]}
      >
        <Pressable
          style={styles.toggleButton}
          onPressIn={startHold}
          onPressOut={stopHold}
          disabled={isScanning}
        >
          <CircularProgress
            size={180}
            strokeWidth={8}
            progress={holdProgress}
            color="#fff"
            backgroundColor="rgba(255, 255, 255, 0.3)"
          >
            <Ionicons
              name={isBlocking ? 'lock-closed' : 'lock-open'}
              size={60}
              color="#fff"
            />
          </CircularProgress>
          <Text style={styles.toggleText}>
            {isScanning
              ? 'Scanning...'
              : isHolding
              ? `${Math.ceil(currentHoldDuration * (1 - holdProgress))}s`
              : isBlocking
              ? 'Hold to unlock'
              : 'Hold to lock'}
          </Text>
          {currentProfile && (
            <Text style={styles.profileText}>{currentProfile.name}</Text>
          )}
          {activeScheduleProfile && scheduleEnabled && (
            <View style={styles.scheduleIndicator}>
              <Ionicons name="time" size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.scheduleText}>
                Scheduled: {activeScheduleProfile.name}
              </Text>
            </View>
          )}
          {!nfcSupported && !isHolding && (
            <Text style={styles.nfcWarning}>NFC not available</Text>
          )}
        </Pressable>
      </Animated.View>

      {!isBlocking && (
        <ProfilePicker
          onNewProfile={handleNewProfile}
          onEditProfile={handleEditProfile}
        />
      )}

      <ProfileForm
        visible={showProfileForm}
        profile={editingProfile}
        onClose={() => setShowProfileForm(false)}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  accessibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  accessibilityBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  toggleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  toggleButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  profileText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  nfcWarning: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  scheduleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  scheduleText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
});
