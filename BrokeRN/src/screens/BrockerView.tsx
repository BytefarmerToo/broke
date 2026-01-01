import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { ProfilePicker } from '../components/ProfilePicker';
import { ProfileForm } from '../components/ProfileForm';
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
  } = useApp();

  const [nfcSupported, setNfcSupported] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [buttonScale] = useState(new Animated.Value(1));

  useEffect(() => {
    initNfc().then(setNfcSupported);
    return () => cleanupNfc();
  }, []);

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

  const handleToggle = async () => {
    if (!currentProfile) {
      Alert.alert('No Profile', 'Please select a profile first');
      return;
    }

    // Check accessibility on Android
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

    animateButton();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!nfcSupported) {
      await toggleBlocking();
      Haptics.notificationAsync(
        isBlocking
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
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
        Haptics.notificationAsync(
          isBlocking
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
      } else {
        Alert.alert('Invalid Tag', 'This is not a Broke tag. Use the + button to create one.');
      }
    } finally {
      setIsScanning(false);
    }
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
          {Platform.OS === 'android' && (
            <TouchableOpacity
              onPress={openAccessibilitySettings}
              style={styles.headerButton}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={accessibilityEnabled ? '#fff' : 'rgba(255,255,255,0.5)'}
              />
            </TouchableOpacity>
          )}
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
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={handleToggle}
          activeOpacity={0.9}
          disabled={isScanning}
        >
          <Ionicons
            name={isBlocking ? 'lock-closed' : 'lock-open'}
            size={80}
            color="#fff"
          />
          <Text style={styles.toggleText}>
            {isScanning
              ? 'Scanning...'
              : isBlocking
              ? 'Tap to unblock'
              : 'Tap to block'}
          </Text>
          {currentProfile && (
            <Text style={styles.profileText}>{currentProfile.name}</Text>
          )}
          {!nfcSupported && (
            <Text style={styles.nfcWarning}>NFC not available - tap to toggle</Text>
          )}
        </TouchableOpacity>
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
  loadingText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
});
