import { NativeModules, Platform } from 'react-native';

interface InstalledApp {
  packageName: string;
  name: string;
  isSystem: boolean;
}

interface AppBlockerInterface {
  isAccessibilityEnabled(): Promise<boolean>;
  openAccessibilitySettings(): Promise<boolean>;
  setBlocking(isBlocking: boolean): Promise<boolean>;
  isBlocking(): Promise<boolean>;
  setBlockedPackages(packages: string[]): Promise<boolean>;
  getBlockedPackages(): Promise<string[]>;
  getInstalledApps(): Promise<InstalledApp[]>;
}

const { AppBlocker: NativeAppBlocker } = NativeModules;

class AppBlockerManager {
  private isAndroid = Platform.OS === 'android';

  async isAccessibilityEnabled(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      return await NativeAppBlocker.isAccessibilityEnabled();
    } catch (error) {
      console.error('Error checking accessibility:', error);
      return false;
    }
  }

  async openAccessibilitySettings(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      return await NativeAppBlocker.openAccessibilitySettings();
    } catch (error) {
      console.error('Error opening settings:', error);
      return false;
    }
  }

  async setBlocking(isBlocking: boolean): Promise<boolean> {
    if (!this.isAndroid) return true;
    try {
      return await NativeAppBlocker.setBlocking(isBlocking);
    } catch (error) {
      console.error('Error setting blocking state:', error);
      return false;
    }
  }

  async getBlocking(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      return await NativeAppBlocker.isBlocking();
    } catch (error) {
      console.error('Error getting blocking state:', error);
      return false;
    }
  }

  async setBlockedPackages(packages: string[]): Promise<boolean> {
    if (!this.isAndroid) return true;
    try {
      return await NativeAppBlocker.setBlockedPackages(packages);
    } catch (error) {
      console.error('Error setting blocked packages:', error);
      return false;
    }
  }

  async getBlockedPackages(): Promise<string[]> {
    if (!this.isAndroid) return [];
    try {
      return await NativeAppBlocker.getBlockedPackages();
    } catch (error) {
      console.error('Error getting blocked packages:', error);
      return [];
    }
  }

  async getInstalledApps(): Promise<InstalledApp[]> {
    if (!this.isAndroid) return [];
    try {
      const apps = await NativeAppBlocker.getInstalledApps();
      // Sort by name, include all launchable apps (don't filter system apps)
      return apps.sort((a: InstalledApp, b: InstalledApp) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
    } catch (error) {
      console.error('Error getting installed apps:', error);
      return [];
    }
  }

  isSupported(): boolean {
    return this.isAndroid && NativeAppBlocker != null;
  }
}

export const appBlocker = new AppBlockerManager();
export type { InstalledApp };
