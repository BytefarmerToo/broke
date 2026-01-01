export interface Profile {
  id: string;
  name: string;
  icon: string;
  blockedApps: string[];
  blockedCategories: string[];
}

export const DEFAULT_ICONS = [
  'lock-closed',
  'briefcase',
  'game-controller',
  'book',
  'moon',
  'sunny',
  'fitness',
  'heart',
  'school',
  'airplane',
  'cafe',
  'code-slash',
  'film',
  'musical-notes',
  'cart',
  'camera',
  'chatbubbles',
  'notifications-off',
  'eye-off',
  'time',
];

export const APP_CATEGORIES = [
  { id: 'social', name: 'Social Media', icon: 'people' },
  { id: 'games', name: 'Games', icon: 'game-controller' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film' },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase' },
  { id: 'news', name: 'News', icon: 'newspaper' },
  { id: 'shopping', name: 'Shopping', icon: 'cart' },
  { id: 'finance', name: 'Finance', icon: 'cash' },
  { id: 'health', name: 'Health & Fitness', icon: 'fitness' },
];

export const SAMPLE_APPS = [
  { id: 'instagram', name: 'Instagram', category: 'social' },
  { id: 'twitter', name: 'Twitter/X', category: 'social' },
  { id: 'tiktok', name: 'TikTok', category: 'social' },
  { id: 'facebook', name: 'Facebook', category: 'social' },
  { id: 'youtube', name: 'YouTube', category: 'entertainment' },
  { id: 'netflix', name: 'Netflix', category: 'entertainment' },
  { id: 'spotify', name: 'Spotify', category: 'entertainment' },
  { id: 'reddit', name: 'Reddit', category: 'social' },
  { id: 'snapchat', name: 'Snapchat', category: 'social' },
  { id: 'discord', name: 'Discord', category: 'social' },
];

export function createDefaultProfile(): Profile {
  return {
    id: generateId(),
    name: 'Default',
    icon: 'lock-closed',
    blockedApps: [],
    blockedCategories: ['social', 'games'],
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
