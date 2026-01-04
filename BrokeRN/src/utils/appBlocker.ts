import { Platform } from 'react-native';
import * as AppBlockerModule from '../../modules/app-blocker';

export interface InstalledApp {
  packageName: string;
  name: string;
  isSystem: boolean;
}

export interface NativeSchedule {
  id: string;
  enabled: boolean;
  days: number[];
  startTime: string;
  blockedPackages: string[];
}

class AppBlockerManager {
  private isAndroid = Platform.OS === 'android';

  isAccessibilityEnabled(): boolean {
    if (!this.isAndroid) return false;
    try {
      return AppBlockerModule.isAccessibilityEnabled();
    } catch (error) {
      console.error('Error checking accessibility:', error);
      return false;
    }
  }

  async openAccessibilitySettings(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      return await AppBlockerModule.openAccessibilitySettings();
    } catch (error) {
      console.error('Error opening settings:', error);
      return false;
    }
  }

  async setBlocking(isBlocking: boolean): Promise<boolean> {
    if (!this.isAndroid) return true;
    try {
      return await AppBlockerModule.setBlocking(isBlocking);
    } catch (error) {
      console.error('Error setting blocking state:', error);
      return false;
    }
  }

  getBlocking(): boolean {
    if (!this.isAndroid) return false;
    try {
      return AppBlockerModule.isBlocking();
    } catch (error) {
      console.error('Error getting blocking state:', error);
      return false;
    }
  }

  async setBlockedPackages(packages: string[]): Promise<boolean> {
    if (!this.isAndroid) return true;
    try {
      return await AppBlockerModule.setBlockedPackages(packages);
    } catch (error) {
      console.error('Error setting blocked packages:', error);
      return false;
    }
  }

  getBlockedPackages(): string[] {
    if (!this.isAndroid) return [];
    try {
      return AppBlockerModule.getBlockedPackages();
    } catch (error) {
      console.error('Error getting blocked packages:', error);
      return [];
    }
  }

  getInstalledApps(): InstalledApp[] {
    if (!this.isAndroid) return [];
    try {
      const apps = AppBlockerModule.getInstalledApps();
      // Sort by name, include all launchable apps
      return apps.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
    } catch (error) {
      console.error('Error getting installed apps:', error);
      return [];
    }
  }

  isSupported(): boolean {
    return this.isAndroid;
  }

  async setSchedules(schedules: NativeSchedule[]): Promise<boolean> {
    if (!this.isAndroid) return true;
    try {
      return await AppBlockerModule.setSchedules(JSON.stringify(schedules));
    } catch (error) {
      console.error('Error setting schedules:', error);
      return false;
    }
  }

  async setScheduleEnabled(enabled: boolean): Promise<boolean> {
    if (!this.isAndroid) return true;
    try {
      return await AppBlockerModule.setScheduleEnabled(enabled);
    } catch (error) {
      console.error('Error setting schedule enabled:', error);
      return false;
    }
  }

  async setManualLock(manual: boolean): Promise<boolean> {
    if (!this.isAndroid) return true;
    try {
      return await AppBlockerModule.setManualLock(manual);
    } catch (error) {
      console.error('Error setting manual lock:', error);
      return false;
    }
  }
}

export const appBlocker = new AppBlockerManager();
