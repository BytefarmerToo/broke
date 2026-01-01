import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, createDefaultProfile } from '../types/Profile';
import { appBlocker } from '../utils/appBlocker';

const STORAGE_KEYS = {
  PROFILES: 'broke_profiles',
  CURRENT_PROFILE_ID: 'broke_current_profile_id',
  IS_BLOCKING: 'broke_is_blocking',
};

interface AppContextType {
  profiles: Profile[];
  currentProfile: Profile | null;
  isBlocking: boolean;
  isLoading: boolean;
  accessibilityEnabled: boolean;
  setCurrentProfile: (profile: Profile) => void;
  toggleBlocking: () => Promise<void>;
  addProfile: (profile: Profile) => void;
  updateProfile: (profile: Profile) => void;
  deleteProfile: (profileId: string) => void;
  checkAccessibility: () => Promise<boolean>;
  openAccessibilitySettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);

  const currentProfile = profiles.find(p => p.id === currentProfileId) || null;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentProfile && Platform.OS === 'android') {
      syncBlockedPackages(currentProfile);
    }
  }, [currentProfile?.id, currentProfile?.blockedApps]);

  const loadData = async () => {
    try {
      const [profilesJson, currentId, blockingState] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROFILES),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROFILE_ID),
        AsyncStorage.getItem(STORAGE_KEYS.IS_BLOCKING),
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

  return (
    <AppContext.Provider
      value={{
        profiles,
        currentProfile,
        isBlocking,
        isLoading,
        accessibilityEnabled,
        setCurrentProfile,
        toggleBlocking,
        addProfile,
        updateProfile,
        deleteProfile,
        checkAccessibility,
        openAccessibilitySettings,
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
