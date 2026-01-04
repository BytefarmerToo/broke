import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, createDefaultProfile, isScheduleActive } from '../types/Profile';
import { appBlocker } from '../utils/appBlocker';

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

  const currentProfile = profiles.find(p => p.id === currentProfileId) || null;

  useEffect(() => {
    loadData();
    return () => {
      if (scheduleCheckRef.current) {
        clearInterval(scheduleCheckRef.current);
      }
    };
  }, []);

  // Schedule checking effect
  useEffect(() => {
    if (!scheduleEnabled || profiles.length === 0) {
      setActiveScheduleProfile(null);
      return;
    }

    const checkSchedules = async () => {
      let foundActiveProfile: Profile | null = null;

      for (const profile of profiles) {
        if (profile.schedules && profile.schedules.length > 0) {
          for (const schedule of profile.schedules) {
            if (isScheduleActive(schedule)) {
              foundActiveProfile = profile;
              break;
            }
          }
        }
        if (foundActiveProfile) break;
      }

      const previousActiveProfile = activeScheduleProfile;
      setActiveScheduleProfile(foundActiveProfile);

      // Auto-enable blocking when schedule becomes active
      if (foundActiveProfile && !previousActiveProfile) {
        if (foundActiveProfile.id !== currentProfileId) {
          setCurrentProfileId(foundActiveProfile.id);
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE_ID, foundActiveProfile.id);
          if (Platform.OS === 'android') {
            await appBlocker.setBlockedPackages(foundActiveProfile.blockedApps);
          }
        }
        if (!isBlocking) {
          setIsBlocking(true);
          await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, 'true');
          if (Platform.OS === 'android') {
            await appBlocker.setBlocking(true);
          }
        }
      }

      // Auto-disable blocking when schedule ends
      if (!foundActiveProfile && previousActiveProfile && isBlocking) {
        setIsBlocking(false);
        await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, 'false');
        if (Platform.OS === 'android') {
          await appBlocker.setBlocking(false);
        }
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
  }, [scheduleEnabled, profiles, currentProfileId, isBlocking, activeScheduleProfile]);

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
    }
  };

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

    // Sync with native blocker on Android
    if (Platform.OS === 'android') {
      await appBlocker.setBlocking(newState);
    }
  }, [isBlocking]);

  const setBlocking = useCallback(async (blocking: boolean) => {
    setIsBlocking(blocking);
    await AsyncStorage.setItem(STORAGE_KEYS.IS_BLOCKING, String(blocking));

    if (Platform.OS === 'android') {
      await appBlocker.setBlocking(blocking);
    }
  }, []);

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
