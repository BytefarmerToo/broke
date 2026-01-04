import { NativeModule, requireNativeModule } from 'expo-modules-core';

export interface InstalledApp {
  packageName: string;
  name: string;
  isSystem: boolean;
}

interface AppBlockerModuleType extends NativeModule {
  isAccessibilityEnabled(): boolean;
  openAccessibilitySettings(): Promise<boolean>;
  setBlocking(isBlocking: boolean): Promise<boolean>;
  isBlocking(): boolean;
  setBlockedPackages(packages: string[]): Promise<boolean>;
  getBlockedPackages(): string[];
  getInstalledApps(): InstalledApp[];
}

const AppBlockerModule = requireNativeModule<AppBlockerModuleType>('AppBlocker');

export function isAccessibilityEnabled(): boolean {
  return AppBlockerModule.isAccessibilityEnabled();
}

export function openAccessibilitySettings(): Promise<boolean> {
  return AppBlockerModule.openAccessibilitySettings();
}

export function setBlocking(isBlocking: boolean): Promise<boolean> {
  return AppBlockerModule.setBlocking(isBlocking);
}

export function isBlocking(): boolean {
  return AppBlockerModule.isBlocking();
}

export function setBlockedPackages(packages: string[]): Promise<boolean> {
  return AppBlockerModule.setBlockedPackages(packages);
}

export function getBlockedPackages(): string[] {
  return AppBlockerModule.getBlockedPackages();
}

export function getInstalledApps(): InstalledApp[] {
  return AppBlockerModule.getInstalledApps();
}
