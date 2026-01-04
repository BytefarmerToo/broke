import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, createDefaultProfile, hasScheduleStarted, getScheduleStartMinutes } from '../types/Profile';
import { appBlocker, NativeSchedule } from '../utils/appBlocker';

const STORAGE_KEYS = {
  PROFILES: 'broke_profiles',
  CURRENT_PROFILE_ID: 'broke_current_profile_id',
  IS_BLOCKING: 'broke_is_blocking',
  SCHEDULE_ENABLED: 'broke_schedule_enabled',
  LOCK_HOLD_DURATION: 'broke_lock_hold_duration',
  UNLOCK_HOLD_DURATION: 'broke_unlock_hold_duration',
};

const DEFAULT_HOLD_DURATION = 15; // seconds

const SCHEDULE_CHECK_INTERVAL = 60000; // Check every minute

interface AppContextType {
  profiles: Profile[];
  currentProfile: Profile | null;
  isBlocking: boolean;
  isLoading: boolean;
  accessibilityEnabled: boolean;
  scheduleEnabled: boolean;
  activeScheduleProfile: Profile | null;
  schedulePaused: boolean;
  lockHoldDuration: number;
  unlockHoldDuration: number;
  setCurrentProfile: (profile: Profile) => void;
  toggleBlocking: () => Promise<void>;
  setBlocking: (blocking: boolean) => Promise<void>;
  addProfile: (profile: Profile) => void;
  updateProfile: (profile: Profile) => void;
  deleteProfile: (profileId: string) => void;
  checkAccessibility: () => Promise<boolean>;
  openAccessibilitySettings: () => Promise<void>;
  setScheduleEnabled: (enabled: boolean) => Promise<void>;
  setLockHoldDuration: (seconds: number) => Promise<void>;
  setUnlockHoldDuration: (seconds: number) => Promise<void>;
  resumeSchedule: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [scheduleEnabled, setScheduleEnabledState] = useState(true);
  const [activeScheduleProfile, setActiveScheduleProfile] = useState<Profile | null>(null);
  const [lockHoldDuration, setLockHoldDurationState] = useState(DEFAULT_HOLD_DURATION);
  const [unlockHoldDuration, setUnlockHoldDurationState] = useState(DEFAULT_HOLD_DURATION);
  const scheduleCheckRef = useRef<NodeJS.Timeout | null>(null);
  // True when user manually locked - new schedules won't auto-activate
  const manualLockRef = useRef<boolean>(false);
  // Profile ID that was dismissed by manual unlock (won't re-trigger until a new schedule)
  const dismissedProfileIdRef = useRef<string | null>(null);
  // True when user manually unlocked during a schedule - can resume
  const [schedulePaused, setSchedulePaused] = useState(false);

  const currentProfile = profiles.find(p => p.id === currentProfileId) || null;

  // Pause schedule when user manually unlocks
  const pauseSchedule = useCallback(() => {
    if (activeScheduleProfile) {
      dismissedProfileIdRef.current = activeScheduleProfile.id;
      setSchedulePaused(true);
    }
  }, [activeScheduleProfile]);

  // Resume the paused schedule
  const resumeSchedule = useCallback(async () => {
    if (!schedulePaused || !activeScheduleProfile) {
      return;
    }

    setSchedulePaused(false);
    dismissedProfileIdRef.current = null;

    // Re-activate the schedule profile
    if (activeScheduleProfile.id !== currentProfileId) {
      setCurrentProfileId(activeScheduleProfile.id);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE_ID, activeScheduleProfile.id);
      if (Platform.OS === 'android') {
        await appBlocker.setBlockedPackages(activeScheduleProfile.blockedApps);
      }
    }
    setIsBlocking(true);
    await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, 'true');
    if (Platform.OS === 'android') {
      await appBlocker.setBlocking(true);
    }
  }, [schedulePaused, activeScheduleProfile, currentProfileId]);

  useEffect(() => {
    loadData();
    return () => {
      if (scheduleCheckRef.current) {
        clearInterval(scheduleCheckRef.current);
      }
    };
  }, []);

  // Schedule checking effect - find the schedule with latest start time that has started today
  useEffect(() => {
    if (!scheduleEnabled || profiles.length === 0) {
      setActiveScheduleProfile(null);
      return;
    }

    const checkSchedules = async () => {
      // Skip if user manually locked
      if (manualLockRef.current) {
        return;
      }

      // Find all started schedules and pick the one with the latest start time
      let bestProfile: Profile | null = null;
      let bestStartMinutes = -1;

      for (const profile of profiles) {
        if (profile.schedules && profile.schedules.length > 0) {
          for (const schedule of profile.schedules) {
            if (hasScheduleStarted(schedule)) {
              const startMinutes = getScheduleStartMinutes(schedule);
              if (startMinutes > bestStartMinutes) {
                bestStartMinutes = startMinutes;
                bestProfile = profile;
              }
            }
          }
        }
      }

      const previousActiveProfile = activeScheduleProfile;
      const profileChanged = bestProfile?.id !== previousActiveProfile?.id;

      // If paused, only activate if a DIFFERENT profile's schedule started
      if (schedulePaused) {
        if (profileChanged && bestProfile && bestProfile.id !== dismissedProfileIdRef.current) {
          // New schedule started - end pause and activate
          setSchedulePaused(false);
          dismissedProfileIdRef.current = null;
          setActiveScheduleProfile(bestProfile);
          if (bestProfile.id !== currentProfileId) {
            setCurrentProfileId(bestProfile.id);
            await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE_ID, bestProfile.id);
            if (Platform.OS === 'android') {
              await appBlocker.setBlockedPackages(bestProfile.blockedApps);
            }
          }
          setIsBlocking(true);
          await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, 'true');
          if (Platform.OS === 'android') {
            await appBlocker.setBlocking(true);
          }
        }
        return;
      }

      if (profileChanged) {
        setActiveScheduleProfile(bestProfile);

        if (bestProfile) {
          // Switch to the new active profile
          if (bestProfile.id !== currentProfileId) {
            setCurrentProfileId(bestProfile.id);
            await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE_ID, bestProfile.id);
            if (Platform.OS === 'android') {
              await appBlocker.setBlockedPackages(bestProfile.blockedApps);
            }
          }
          // Enable blocking if not already
          if (!isBlocking) {
            setIsBlocking(true);
            await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, 'true');
            if (Platform.OS === 'android') {
              await appBlocker.setBlocking(true);
            }
          }
        }
        // Note: We don't auto-disable blocking when no schedules are active
        // since there are no end times - blocking continues until manual unlock
      }
    };

    // Initial check
    checkSchedules();

    // Set up interval
    scheduleCheckRef.current = setInterval(checkSchedules, SCHEDULE_CHECK_INTERVAL);

    return () => {
      if (scheduleCheckRef.current) {
        clearInterval(scheduleCheckRef.current);
      }
    };
  }, [scheduleEnabled, profiles, currentProfileId, isBlocking, activeScheduleProfile, schedulePaused]);

  useEffect(() => {
    if (currentProfile && Platform.OS === 'android') {
      syncBlockedPackages(currentProfile);
    }
  }, [currentProfile?.id, currentProfile?.blockedApps]);

  const loadData = async () => {
    try {
      const [profilesJson, currentId, blockingState, scheduleState, lockDuration, unlockDuration] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROFILES),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROFILE_ID),
        AsyncStorage.getItem(STORAGE_KEYS.IS_BLOCKING),
        AsyncStorage.getItem(STORAGE_KEYS.SCHEDULE_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.LOCK_HOLD_DURATION),
        AsyncStorage.getItem(STORAGE_KEYS.UNLOCK_HOLD_DURATION),
      ]);

      let loadedProfiles: Profile[] = [];
      if (profilesJson) {
        loadedProfiles = JSON.parse(profilesJson);
      }

      if (loadedProfiles.length === 0) {
        const defaultProfile = createDefaultProfile();
        loadedProfiles = [defaultProfile];
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(loadedProfiles));
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE_ID, defaultProfile.id);
        setCurrentProfileId(defaultProfile.id);
      } else {
        setCurrentProfileId(currentId || loadedProfiles[0].id);
      }

      setProfiles(loadedProfiles);

      const savedBlocking = blockingState === 'true';
      setIsBlocking(savedBlocking);

      // Schedule is enabled by default
      setScheduleEnabledState(scheduleState !== 'false');

      // Load hold durations
      if (lockDuration) {
        setLockHoldDurationState(parseInt(lockDuration, 10));
      }
      if (unlockDuration) {
        setUnlockHoldDurationState(parseInt(unlockDuration, 10));
      }

      // Sync with native blocker on Android
      if (Platform.OS === 'android') {
        await appBlocker.setBlocking(savedBlocking);
        await appBlocker.setScheduleEnabled(scheduleState !== 'false');
        const isEnabled = await appBlocker.isAccessibilityEnabled();
        setAccessibilityEnabled(isEnabled);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const defaultProfile = createDefaultProfile();
      setProfiles([defaultProfile]);
      setCurrentProfileId(defaultProfile.id);
    } finally {
      setIsLoading(false);
    }
  };

  const syncBlockedPackages = async (profile: Profile) => {
    if (Platform.OS === 'android' && profile.blockedApps) {
      await appBlocker.setBlockedPackages(profile.blockedApps);
      await appBlocker.setBlockedCategories(profile.blockedCategories);
    }
  };

  // Convert profiles to native schedule format and sync to native module
  const syncSchedulesToNative = useCallback(async (profilesToSync: Profile[]) => {
    if (Platform.OS !== 'android') return;

    const nativeSchedules: NativeSchedule[] = profilesToSync.flatMap(profile =>
      (profile.schedules || []).map(schedule => ({
        id: schedule.id,
        enabled: schedule.enabled,
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime || '23:59',
        blockedPackages: profile.blockedApps,
        blockedCategories: profile.blockedCategories,
        blockedAppNames: [],
      }))
    );

    await appBlocker.setSchedules(nativeSchedules);
  }, []);

  // Sync schedules to native whenever profiles change
  useEffect(() => {
    if (profiles.length > 0 && !isLoading) {
      syncSchedulesToNative(profiles);
    }
  }, [profiles, isLoading, syncSchedulesToNative]);

  const saveProfiles = async (newProfiles: Profile[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(newProfiles));
    setProfiles(newProfiles);
  };

  const setCurrentProfile = useCallback(async (profile: Profile) => {
    setCurrentProfileId(profile.id);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE_ID, profile.id);
    if (Platform.OS === 'android') {
      await syncBlockedPackages(profile);
    }
  }, []);

  const toggleBlocking = useCallback(async () => {
    const newState = !isBlocking;
    setIsBlocking(newState);
    await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, String(newState));

    if (newState) {
      // Manual lock - pause schedules until manual unlock
      manualLockRef.current = true;
      setSchedulePaused(false); // Clear any paused state when manually locking
    } else {
      // Manual unlock - pause schedule (can resume later)
      manualLockRef.current = false;
      pauseSchedule();
    }

    // Sync with native blocker on Android
    if (Platform.OS === 'android') {
      await appBlocker.setBlocking(newState);
      await appBlocker.setManualLock(manualLockRef.current);
    }
  }, [isBlocking, pauseSchedule]);

  const setBlocking = useCallback(async (blocking: boolean) => {
    setIsBlocking(blocking);
    await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, String(blocking));

    if (blocking) {
      // Manual lock - pause schedules until manual unlock
      manualLockRef.current = true;
      setSchedulePaused(false);
    } else {
      // Manual unlock - pause schedule (can resume later)
      manualLockRef.current = false;
      pauseSchedule();
    }

    if (Platform.OS === 'android') {
      await appBlocker.setBlocking(blocking);
      await appBlocker.setManualLock(manualLockRef.current);
    }
  }, [pauseSchedule]);

  const addProfile = useCallback(async (profile: Profile) => {
    const newProfiles = [...profiles, profile];
    await saveProfiles(newProfiles);
    setCurrentProfile(profile);
  }, [profiles, setCurrentProfile]);

  const updateProfile = useCallback(async (profile: Profile) => {
    const newProfiles = profiles.map(p => p.id === profile.id ? profile : p);
    await saveProfiles(newProfiles);
    if (currentProfileId === profile.id) {
      await syncBlockedPackages(profile);
    }
  }, [profiles, currentProfileId]);

  const deleteProfile = useCallback(async (profileId: string) => {
    const newProfiles = profiles.filter(p => p.id !== profileId);

    if (newProfiles.length === 0) {
      const defaultProfile = createDefaultProfile();
      newProfiles.push(defaultProfile);
    }

    await saveProfiles(newProfiles);

    if (currentProfileId === profileId) {
      setCurrentProfile(newProfiles[0]);
    }
  }, [profiles, currentProfileId, setCurrentProfile]);

  const checkAccessibility = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const isEnabled = await appBlocker.isAccessibilityEnabled();
    setAccessibilityEnabled(isEnabled);
    return isEnabled;
  }, []);

  const openAccessibilitySettings = useCallback(async () => {
    if (Platform.OS === 'android') {
      await appBlocker.openAccessibilitySettings();
    }
  }, []);

  const setScheduleEnabled = useCallback(async (enabled: boolean) => {
    setScheduleEnabledState(enabled);
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULE_ENABLED, String(enabled));
    if (Platform.OS === 'android') {
      await appBlocker.setScheduleEnabled(enabled);
    }
  }, []);

  const setLockHoldDuration = useCallback(async (seconds: number) => {
    setLockHoldDurationState(seconds);
    await AsyncStorage.setItem(STORAGE_KEYS.LOCK_HOLD_DURATION, String(seconds));
  }, []);

  const setUnlockHoldDuration = useCallback(async (seconds: number) => {
    setUnlockHoldDurationState(seconds);
    await AsyncStorage.setItem(STORAGE_KEYS.UNLOCK_HOLD_DURATION, String(seconds));
  }, []);

  return (
    <AppContext.Provider
      value={{
        profiles,
        currentProfile,
        isBlocking,
        isLoading,
        accessibilityEnabled,
        scheduleEnabled,
        activeScheduleProfile,
        schedulePaused,
        lockHoldDuration,
        unlockHoldDuration,
        setCurrentProfile,
        toggleBlocking,
        setBlocking,
        addProfile,
        updateProfile,
        deleteProfile,
        checkAccessibility,
        openAccessibilitySettings,
        setScheduleEnabled,
        setLockHoldDuration,
        setUnlockHoldDuration,
        resumeSchedule,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
