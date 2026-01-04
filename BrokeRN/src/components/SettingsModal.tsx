import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useApp } from '../context/AppContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const DURATION_OPTIONS = [3, 5, 10, 15, 20, 30, 45, 60];

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const {
    lockHoldDuration,
    unlockHoldDuration,
    setLockHoldDuration,
    setUnlockHoldDuration,
    scheduleEnabled,
    setScheduleEnabled,
    accessibilityEnabled,
    openAccessibilitySettings,
  } = useApp();

  const [localLockDuration, setLocalLockDuration] = useState(lockHoldDuration);
  const [localUnlockDuration, setLocalUnlockDuration] = useState(unlockHoldDuration);

  React.useEffect(() => {
    if (visible) {
      setLocalLockDuration(lockHoldDuration);
      setLocalUnlockDuration(unlockHoldDuration);
    }
  }, [visible, lockHoldDuration, unlockHoldDuration]);

  const handleLockDurationChange = async (value: number) => {
    const rounded = Math.round(value);
    setLocalLockDuration(rounded);
    await setLockHoldDuration(rounded);
  };

  const handleUnlockDurationChange = async (value: number) => {
    const rounded = Math.round(value);
    setLocalUnlockDuration(rounded);
    await setUnlockHoldDuration(rounded);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.doneButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hold Duration</Text>
            <Text style={styles.sectionDescription}>
              How long you need to hold the button to lock or unlock
            </Text>

            <View style={styles.durationRow}>
              <View style={styles.durationLabel}>
                <Ionicons name="lock-closed" size={20} color="#ef4444" />
                <Text style={styles.durationText}>Lock</Text>
              </View>
              <Text style={styles.durationValue}>{formatDuration(localLockDuration)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={3}
              maximumValue={60}
              step={1}
              value={localLockDuration}
              onValueChange={setLocalLockDuration}
              onSlidingComplete={handleLockDurationChange}
              minimumTrackTintColor="#ef4444"
              maximumTrackTintColor="#d1d5db"
              thumbTintColor="#ef4444"
            />

            <View style={styles.durationRow}>
              <View style={styles.durationLabel}>
                <Ionicons name="lock-open" size={20} color="#22c55e" />
                <Text style={styles.durationText}>Unlock</Text>
              </View>
              <Text style={styles.durationValue}>{formatDuration(localUnlockDuration)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={3}
              maximumValue={60}
              step={1}
              value={localUnlockDuration}
              onValueChange={setLocalUnlockDuration}
              onSlidingComplete={handleUnlockDurationChange}
              minimumTrackTintColor="#22c55e"
              maximumTrackTintColor="#d1d5db"
              thumbTintColor="#22c55e"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scheduling</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Schedule</Text>
                <Text style={styles.settingDescription}>
                  Automatically activate profiles based on schedules
                </Text>
              </View>
              <Switch
                value={scheduleEnabled}
                onValueChange={setScheduleEnabled}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {Platform.OS === 'android' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={openAccessibilitySettings}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Accessibility Service</Text>
                  <Text style={styles.settingDescription}>
                    Required to block apps on Android
                  </Text>
                </View>
                <View style={styles.permissionStatus}>
                  <Text
                    style={[
                      styles.permissionText,
                      accessibilityEnabled ? styles.permissionEnabled : styles.permissionDisabled,
                    ]}
                  >
                    {accessibilityEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerSpacer: {
    width: 50,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  doneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  durationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationText: {
    fontSize: 16,
    color: '#374151',
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#111827',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  permissionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  permissionEnabled: {
    color: '#22c55e',
  },
  permissionDisabled: {
    color: '#ef4444',
  },
});
