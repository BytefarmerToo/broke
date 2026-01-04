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
import { Schedule, DAYS_OF_WEEK, formatTime, generateId } from '../types/Profile';

interface ScheduleFormProps {
  visible: boolean;
  schedule: Schedule | null;
  onSave: (schedule: Schedule) => void;
  onDelete?: () => void;
  onClose: () => void;
}

interface TimePickerProps {
  visible: boolean;
  value: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}

function TimePicker({ visible, value, onSelect, onClose }: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(() => parseInt(value.split(':')[0], 10));
  const [selectedMinute, setSelectedMinute] = useState(() => parseInt(value.split(':')[1], 10));

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const handleSave = () => {
    const time = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onSelect(time);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>Select Time</Text>
          <View style={styles.timePickerRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}>Hour</Text>
              <View style={styles.timeOptions}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.timeOption,
                      selectedHour === hour && styles.timeOptionSelected,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selectedHour === hour && styles.timeOptionTextSelected,
                      ]}
                    >
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}>Min</Text>
              <View style={styles.timeOptions}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.timeOption,
                      selectedMinute === minute && styles.timeOptionSelected,
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selectedMinute === minute && styles.timeOptionTextSelected,
                      ]}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.pickerButtons}>
            <TouchableOpacity style={styles.pickerButton} onPress={onClose}>
              <Text style={styles.pickerButtonCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerButton} onPress={handleSave}>
              <Text style={styles.pickerButtonSave}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ScheduleForm({ visible, schedule, onSave, onDelete, onClose }: ScheduleFormProps) {
  const isEditing = schedule !== null;

  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [days, setDays] = useState<number[]>(schedule?.days ?? [1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState(schedule?.startTime ?? '09:00');
  const [showStartPicker, setShowStartPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setEnabled(schedule?.enabled ?? true);
      setDays(schedule?.days ?? [1, 2, 3, 4, 5]);
      setStartTime(schedule?.startTime ?? '09:00');
    }
  }, [visible, schedule]);

  const toggleDay = (dayId: number) => {
    setDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleSave = () => {
    onSave({
      id: schedule?.id ?? generateId(),
      enabled,
      days,
      startTime,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Edit Schedule' : 'New Schedule'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.enabledRow}>
              <Text style={styles.enabledLabel}>Enabled</Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Days</Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayButton,
                    days.includes(day.id) && styles.dayButtonSelected,
                  ]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      days.includes(day.id) && styles.dayButtonTextSelected,
                    ]}
                  >
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start Time</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {isEditing && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Text style={styles.deleteButtonText}>Delete Schedule</Text>
            </TouchableOpacity>
          )}
        </View>

        <TimePicker
          visible={showStartPicker}
          value={startTime}
          onSelect={setStartTime}
          onClose={() => setShowStartPicker(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  enabledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
  },
  enabledLabel: {
    fontSize: 16,
    color: '#111827',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
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
    maxWidth: 300,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeColumnLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    maxWidth: 100,
  },
  timeOption: {
    width: 44,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  timeOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  pickerButton: {
    padding: 12,
  },
  pickerButtonCancel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#49454f',
  },
  pickerButtonSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
});
