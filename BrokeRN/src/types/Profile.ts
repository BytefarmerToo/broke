export interface Schedule {
  id: string;
  enabled: boolean;
  days: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:MM" format (24-hour)
}

export interface Profile {
  id: string;
  name: string;
  icon: string;
  blockedApps: string[];
  blockedCategories: string[];
  schedules?: Schedule[];
}

export const DAYS_OF_WEEK = [
  { id: 0, short: 'Sun', long: 'Sunday' },
  { id: 1, short: 'Mon', long: 'Monday' },
  { id: 2, short: 'Tue', long: 'Tuesday' },
  { id: 3, short: 'Wed', long: 'Wednesday' },
  { id: 4, short: 'Thu', long: 'Thursday' },
  { id: 5, short: 'Fri', long: 'Friday' },
  { id: 6, short: 'Sat', long: 'Saturday' },
];

export function createDefaultSchedule(): Schedule {
  return {
    id: generateId(),
    enabled: true,
    days: [1, 2, 3, 4, 5], // Weekdays by default
    startTime: '09:00',
  };
}

// Returns true if the schedule has started (current time >= start time on a scheduled day)
export function hasScheduleStarted(schedule: Schedule): boolean {
  if (!schedule.enabled) return false;

  const now = new Date();
  const currentDay = now.getDay();

  if (!schedule.days.includes(currentDay)) return false;

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= schedule.startTime;
}

// Returns the start time in minutes for comparison
export function getScheduleStartMinutes(schedule: Schedule): number {
  const [hours, minutes] = schedule.startTime.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
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
