import { NativeModule, requireNativeModule } from 'expo-modules-core';

export interface InstalledApp {
  packageName: string;
  name: string;
  isSystem: boolean;
  category: number;
  categoryName: string;
}

interface AppBlockerModuleType extends NativeModule {
  isAccessibilityEnabled(): boolean;
  openAccessibilitySettings(): Promise<boolean>;
  setBlocking(isBlocking: boolean): Promise<boolean>;
  isBlocking(): boolean;
  setBlockedPackages(packages: string[]): Promise<boolean>;
  getBlockedPackages(): string[];
  setBlockedCategories(categories: number[]): Promise<boolean>;
  getBlockedCategories(): number[];
  setBlockedAppNames(names: string[]): Promise<boolean>;
  getBlockedAppNames(): string[];
  getInstalledApps(): InstalledApp[];
  setSchedules(schedulesJson: string): Promise<boolean>;
  setScheduleEnabled(enabled: boolean): Promise<boolean>;
  setManualLock(manual: boolean): Promise<boolean>;
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

export function setBlockedCategories(categories: number[]): Promise<boolean> {
  return AppBlockerModule.setBlockedCategories(categories);
}

export function getBlockedCategories(): number[] {
  return AppBlockerModule.getBlockedCategories();
}

export function setBlockedAppNames(names: string[]): Promise<boolean> {
  return AppBlockerModule.setBlockedAppNames(names);
}

export function getBlockedAppNames(): string[] {
  return AppBlockerModule.getBlockedAppNames();
}

export function getInstalledApps(): InstalledApp[] {
  return AppBlockerModule.getInstalledApps();
}

export function setSchedules(schedulesJson: string): Promise<boolean> {
  return AppBlockerModule.setSchedules(schedulesJson);
}

export function setScheduleEnabled(enabled: boolean): Promise<boolean> {
  return AppBlockerModule.setScheduleEnabled(enabled);
}

export function setManualLock(manual: boolean): Promise<boolean> {
  return AppBlockerModule.setManualLock(manual);
}
