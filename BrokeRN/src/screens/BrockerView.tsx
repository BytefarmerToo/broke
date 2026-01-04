import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "../context/AppContext";
import { ProfilePicker } from "../components/ProfilePicker";
import { ProfileForm } from "../components/ProfileForm";
import { SettingsModal } from "../components/SettingsModal";
import { CircularProgress } from "../components/CircularProgress";
import { initNfc, readNfcTag, cleanupNfc } from "../utils/nfc";
import { Profile } from "../types/Profile";
import { StatusBar } from "react-native";

const COLORS = {
  blocking: "#ef4444",
  notBlocking: "#22c55e",
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
    schedulePaused,
    resumeSchedule,
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
  const [scanPulse] = useState(new Animated.Value(1));
  const [appIsActive, setAppIsActive] = useState(true);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);
  const handleToggleCompleteRef = useRef<() => void>(() => {});
  const nfcCancelledRef = useRef(false);
  const scanAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

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

  // Start/stop pulsing animation based on scanning state
  const startScanAnimation = useCallback(() => {
    scanAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scanPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    scanAnimationRef.current.start();
  }, [scanPulse]);

  const stopScanAnimation = useCallback(() => {
    if (scanAnimationRef.current) {
      scanAnimationRef.current.stop();
      scanAnimationRef.current = null;
    }
    scanPulse.setValue(1);
  }, [scanPulse]);

  // Track app foreground/background state
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const isActive = nextAppState === "active";
      setAppIsActive(isActive);

      if (isActive) {
        // Reset cancelled flag when app becomes active
        nfcCancelledRef.current = false;
      } else if (isScanning) {
        // Cancel NFC scanning when going to background
        nfcCancelledRef.current = true;
        cleanupNfc();
        setIsScanning(false);
        stopScanAnimation();
      }
    });

    return () => subscription.remove();
  }, [isScanning, stopScanAnimation]);

  const currentHoldDuration = isBlocking
    ? unlockHoldDuration
    : lockHoldDuration;

  const stopHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartTimeRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
    // Resume scan animation if still blocking
    if (isBlocking && isScanning) {
      startScanAnimation();
    }
  }, [isBlocking, isScanning, startScanAnimation]);

  const handleToggleComplete = useCallback(async () => {
    Haptics.notificationAsync(
      isBlocking
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );

    animateButton();
    await toggleBlocking();
  }, [isBlocking, toggleBlocking]);

  // Continuous NFC scanning while locked and app is active
  const startNfcScanning = useCallback(async () => {
    if (!nfcSupported || !isBlocking || isScanning || !appIsActive) return;

    nfcCancelledRef.current = false;
    setIsScanning(true);
    startScanAnimation();

    try {
      const result = await readNfcTag();

      // Don't show error if intentionally cancelled
      if (!result.success) {
        if (!nfcCancelledRef.current && !result.message?.includes("cancelled")) {
          // Silently restart scanning on errors (no alert)
          setIsScanning(false);
          stopScanAnimation();
        }
        return;
      }

      if (result.isValid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        animateButton();
        await toggleBlocking();
      } else {
        Alert.alert(
          "Invalid Tag",
          "This is not a Broke tag. Create one in Settings."
        );
        // Restart scanning after invalid tag
        setIsScanning(false);
        stopScanAnimation();
      }
    } catch {
      setIsScanning(false);
      stopScanAnimation();
    }
  }, [nfcSupported, isBlocking, isScanning, appIsActive, toggleBlocking, startScanAnimation, stopScanAnimation]);

  // Auto-start NFC scanning when locked and app is active
  useEffect(() => {
    if (isBlocking && nfcSupported && !isScanning && appIsActive) {
      startNfcScanning();
    }

    if (!isBlocking && isScanning) {
      nfcCancelledRef.current = true;
      cleanupNfc();
      setIsScanning(false);
      stopScanAnimation();
    }
  }, [isBlocking, nfcSupported, appIsActive]);

  // Restart scanning after it completes (for continuous scanning)
  useEffect(() => {
    if (isBlocking && nfcSupported && !isScanning && !nfcCancelledRef.current && appIsActive) {
      const timer = setTimeout(() => {
        startNfcScanning();
      }, 500); // Small delay before restarting
      return () => clearTimeout(timer);
    }
  }, [isScanning, isBlocking, nfcSupported, appIsActive]);

  // Keep ref updated with latest handleToggleComplete
  useEffect(() => {
    handleToggleCompleteRef.current = handleToggleComplete;
  }, [handleToggleComplete]);

  const startHold = useCallback(() => {
    if (!currentProfile) {
      Alert.alert("No Profile", "Please select a profile first");
      return;
    }

    if (Platform.OS === "android" && !accessibilityEnabled) {
      Alert.alert(
        "Accessibility Required",
        "Broke needs Accessibility Service permission to block apps. Would you like to enable it now?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: openAccessibilitySettings,
          },
        ]
      );
      return;
    }

    // Pause NFC scanning animation while holding
    stopScanAnimation();

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
        handleToggleCompleteRef.current();
      }
    }, updateInterval);
  }, [
    currentProfile,
    accessibilityEnabled,
    currentHoldDuration,
    openAccessibilitySettings,
    stopHold,
    stopScanAnimation,
  ]);

  // Re-check accessibility when app comes to foreground
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
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
  const showAccessibilityWarning =
    Platform.OS === "android" && !accessibilityEnabled;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        backgroundColor="white"
        barStyle="dark-content" // Use "light-content" for dark backgrounds
        translucent={false}
      />
      <View style={[styles.header, { backgroundColor }]}>
        <Text style={styles.headerTitle}>Broke</Text>
        {!isBlocking && (
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
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
        >
          <Animated.View
            style={
              isBlocking && isScanning && !isHolding
                ? { transform: [{ scale: scanPulse }] }
                : undefined
            }
          >
            <CircularProgress
              size={180}
              strokeWidth={8}
              progress={holdProgress}
              color="#fff"
              backgroundColor="rgba(255, 255, 255, 0.3)"
            >
              <Ionicons
                name={isBlocking ? "lock-closed" : "lock-open"}
                size={60}
                color="#fff"
              />
            </CircularProgress>
          </Animated.View>
          <Text style={styles.toggleText}>
            {isHolding
              ? `${Math.ceil(currentHoldDuration * (1 - holdProgress))}s`
              : isBlocking
              ? "Hold to unlock"
              : "Hold to lock"}
          </Text>
          {isBlocking && nfcSupported && !isHolding && (
            <Text style={styles.nfcHintText}>or scan NFC tag</Text>
          )}
          {currentProfile && (
            <Text style={styles.profileText}>{currentProfile.name}</Text>
          )}
          {activeScheduleProfile && scheduleEnabled && (
            <View style={styles.scheduleIndicator}>
              <Ionicons
                name="time"
                size={14}
                color="rgba(255, 255, 255, 0.8)"
              />
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

      {schedulePaused && !isBlocking && (
        <TouchableOpacity
          style={styles.resumeScheduleButton}
          onPress={resumeSchedule}
        >
          <Ionicons name="play-circle-outline" size={20} color="#fff" />
          <Text style={styles.resumeScheduleText}>Resume Schedule</Text>
        </TouchableOpacity>
      )}

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
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  headerButton: {
    padding: 4,
  },
  accessibilityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  accessibilityBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
  },
  toggleContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  toggleButton: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginTop: 24,
  },
  profileText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 8,
  },
  nfcWarning: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 8,
  },
  nfcHintText: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  scheduleIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  scheduleText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  loadingText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  resumeScheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  resumeScheduleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
