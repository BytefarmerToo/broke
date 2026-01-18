import React, { useState, useEffect, ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Profile, Schedule, DEFAULT_ICONS, APP_CATEGORIES, SAMPLE_APPS, generateId, DAYS_OF_WEEK, formatTime } from '../types/Profile';

type IconName = ComponentProps<typeof Ionicons>['name'];
import { useApp } from '../context/AppContext';
import { appBlocker, InstalledApp } from '../utils/appBlocker';
import { ScheduleForm } from './ScheduleForm';

interface ProfileFormProps {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
}

export function ProfileForm({ visible, profile, onClose }: ProfileFormProps) {
  const { addProfile, updateProfile, deleteProfile } = useApp();
  const isEditing = profile !== null;
  const isAndroid = Platform.OS === 'android';

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('lock-closed');
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [blockedCategories, setBlockedCategories] = useState<number[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAppPicker, setShowAppPicker] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setIcon(profile.icon);
      setBlockedApps(profile.blockedApps);
      setBlockedCategories(profile.blockedCategories);
      setSchedules(profile.schedules || []);
    } else {
      setName('');
      setIcon('lock-closed');
      setBlockedApps([]);
      setBlockedCategories([]);
      setSchedules([]);
    }
  }, [profile, visible]);

  useEffect(() => {
    if (isAndroid && showAppPicker && installedApps.length === 0) {
      loadInstalledApps();
    }
  }, [showAppPicker, isAndroid]);

  const loadInstalledApps = async () => {
    setLoadingApps(true);
    try {
      const apps = await appBlocker.getInstalledApps();
      setInstalledApps(apps);
    } catch (error) {
      console.error('Error loading apps:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a profile name');
      return;
    }

    const profileData: Profile = {
      id: profile?.id || generateId(),
      name: name.trim(),
      icon,
      blockedApps,
      blockedCategories,
      schedules,
    };

    if (isEditing) {
      updateProfile(profileData);
    } else {
      addProfile(profileData);
    }

    onClose();
  };

  const handleSaveSchedule = (schedule: Schedule) => {
    setSchedules((prev) => {
      const exists = prev.find((s) => s.id === schedule.id);
      if (exists) {
        return prev.map((s) => (s.id === schedule.id ? schedule : s));
      }
      return [...prev, schedule];
    });
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = () => {
    if (editingSchedule) {
      setSchedules((prev) => prev.filter((s) => s.id !== editingSchedule.id));
      setEditingSchedule(null);
      setShowScheduleForm(false);
    }
  };

  const formatScheduleDays = (days: number[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map((d) => DAYS_OF_WEEK[d].short).join(', ');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProfile(profile!.id);
            onClose();
          },
        },
      ]
    );
  };

  const toggleCategory = (categoryId: number) => {
    setBlockedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleApp = (appId: string) => {
    setBlockedApps((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId]
    );
  };

  const filteredApps = installedApps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAppItem = ({ item }: { item: InstalledApp }) => {
    const isSelected = blockedApps.includes(item.packageName);
    return (
      <TouchableOpacity
        style={[styles.appItem, isSelected && styles.appItemSelected]}
        onPress={() => toggleApp(item.packageName)}
      >
        <View style={styles.appInfo}>
          <Text style={[styles.appName, isSelected && styles.appNameSelected]}>
            {item.name}
          </Text>
          <Text style={[styles.packageName, isSelected && styles.packageNameSelected]}>
            {item.packageName}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.dragHandle} />
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{isEditing ? 'Edit Profile' : 'New Profile'}</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter profile name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Icon</Text>
                <TouchableOpacity
                  style={styles.iconSelector}
                  onPress={() => setShowIconPicker(true)}
                >
                  <Ionicons name={icon as IconName} size={32} color="#374151" />
                  <Text style={styles.iconSelectorText}>Tap to change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Block Categories</Text>
                <View style={styles.optionGrid}>
                  {APP_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.optionCell,
                        blockedCategories.includes(category.id) && styles.optionCellSelected,
                      ]}
                      onPress={() => toggleCategory(category.id)}
                    >
                      <Ionicons
                        name={category.icon as IconName}
                        size={20}
                        color={blockedCategories.includes(category.id) ? '#fff' : '#374151'}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          blockedCategories.includes(category.id) && styles.optionTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Block Apps {blockedApps.length > 0 && `(${blockedApps.length})`}
                </Text>
                {isAndroid ? (
                  <TouchableOpacity
                    style={styles.selectAppsButton}
                    onPress={() => setShowAppPicker(true)}
                  >
                    <Ionicons name="apps" size={24} color="#3b82f6" />
                    <Text style={styles.selectAppsText}>
                      {blockedApps.length > 0
                        ? `${blockedApps.length} apps selected`
                        : 'Select apps to block'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.optionGrid}>
                    {SAMPLE_APPS.map((app) => (
                      <TouchableOpacity
                        key={app.id}
                        style={[
                          styles.optionCell,
                          blockedApps.includes(app.id) && styles.optionCellSelected,
                        ]}
                        onPress={() => toggleApp(app.id)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            blockedApps.includes(app.id) && styles.optionTextSelected,
                          ]}
                        >
                          {app.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Schedules {schedules.length > 0 && `(${schedules.length})`}
                </Text>
                {schedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[
                      styles.scheduleItem,
                      !schedule.enabled && styles.scheduleItemDisabled,
                    ]}
                    onPress={() => {
                      setEditingSchedule(schedule);
                      setShowScheduleForm(true);
                    }}
                  >
                    <View style={styles.scheduleInfo}>
                      <Text style={[
                        styles.scheduleTime,
                        !schedule.enabled && styles.scheduleTextDisabled,
                      ]}>
                        {formatTime(schedule.startTime)}
                      </Text>
                      <Text style={[
                        styles.scheduleDays,
                        !schedule.enabled && styles.scheduleTextDisabled,
                      ]}>
                        {formatScheduleDays(schedule.days)}
                      </Text>
                    </View>
                    <Ionicons
                      name={schedule.enabled ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={schedule.enabled ? '#22c55e' : '#9ca3af'}
                    />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addScheduleButton}
                  onPress={() => {
                    setEditingSchedule(null);
                    setShowScheduleForm(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
                  <Text style={styles.addScheduleText}>Add Schedule</Text>
                </TouchableOpacity>
              </View>

              {isEditing && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>Delete Profile</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

        {/* Icon Picker Modal */}
        <Modal visible={showIconPicker} animationType="fade" transparent>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerTitle}>Choose Icon</Text>
              <View style={styles.iconGrid}>
                {DEFAULT_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconCell,
                      icon === iconName && styles.iconCellSelected,
                    ]}
                    onPress={() => {
                      setIcon(iconName);
                      setShowIconPicker(false);
                    }}
                  >
                    <Ionicons
                      name={iconName as IconName}
                      size={28}
                      color={icon === iconName ? '#fff' : '#374151'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowIconPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* App Picker Modal (Android only) */}
        <Modal visible={showAppPicker} animationType="slide">
          <SafeAreaView style={styles.appPickerContainer}>
            <View style={styles.appPickerHeader}>
              <TouchableOpacity onPress={() => setShowAppPicker(false)}>
                <Text style={styles.cancelButton}>Done</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Select Apps</Text>
              <Text style={styles.appCount}>{blockedApps.length} selected</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search apps..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            {loadingApps ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading apps...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredApps}
                renderItem={renderAppItem}
                keyExtractor={(item) => item.packageName}
                style={styles.appListContainer}
                contentContainerStyle={styles.appList}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={true}
              />
            )}
          </SafeAreaView>
        </Modal>

        <ScheduleForm
          visible={showScheduleForm}
          schedule={editingSchedule}
          onSave={handleSaveSchedule}
          onDelete={editingSchedule ? handleDeleteSchedule : undefined}
          onClose={() => {
            setShowScheduleForm(false);
            setEditingSchedule(null);
          }}
        />
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    minHeight: '80%',
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '500',
    color: '#49454f',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  iconSelectorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  optionCellSelected: {
    backgroundColor: '#3b82f6',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#fff',
  },
  selectAppsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  selectAppsText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCellSelected: {
    backgroundColor: '#3b82f6',
  },
  pickerCloseButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  pickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  appPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  appPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  appCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  appListContainer: {
    flex: 1,
  },
  appList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  appItemSelected: {
    backgroundColor: '#3b82f6',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  appNameSelected: {
    color: '#fff',
  },
  packageName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  packageNameSelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  separator: {
    height: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  scheduleItemDisabled: {
    opacity: 0.6,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scheduleDays: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  scheduleTextDisabled: {
    color: '#9ca3af',
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  addScheduleText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
});
