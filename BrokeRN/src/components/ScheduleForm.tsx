import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  title: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}

function TimePicker({ visible, value, title, onSelect, onClose }: TimePickerProps) {
  // Convert 24-hour to 12-hour format for display
  const parse24Hour = (time: string) => {
    const hour24 = parseInt(time.split(':')[0], 10);
    const minute = parseInt(time.split(':')[1], 10);
    const isAM = hour24 < 12;
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute, isAM };
  };

  const initial = parse24Hour(value);
  const [selectedHour, setSelectedHour] = useState(initial.hour12);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [isAM, setIsAM] = useState(initial.isAM);

  React.useEffect(() => {
    if (visible) {
      const parsed = parse24Hour(value);
      setSelectedHour(parsed.hour12);
      setSelectedMinute(parsed.minute);
      setIsAM(parsed.isAM);
    }
  }, [visible, value]);

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 15, 30, 45];

  const handleSave = () => {
    // Convert 12-hour back to 24-hour
    let hour24 = selectedHour;
    if (isAM) {
      if (selectedHour === 12) hour24 = 0;
    } else {
      if (selectedHour !== 12) hour24 = selectedHour + 12;
    }
    const time = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onSelect(time);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <View style={styles.timePickerRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}>Hour</Text>
              <View style={styles.timeOptionsGrid}>
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
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}>Min</Text>
              <View style={styles.timeOptionsSmall}>
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
            <View style={styles.timeColumn}>
              <Text style={styles.timeColumnLabel}> </Text>
              <View style={styles.amPmColumn}>
                <TouchableOpacity
                  style={[
                    styles.amPmOption,
                    isAM && styles.amPmOptionSelected,
                  ]}
                  onPress={() => setIsAM(true)}
                >
                  <Text
                    style={[
                      styles.amPmText,
                      isAM && styles.amPmTextSelected,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.amPmOption,
                    !isAM && styles.amPmOptionSelected,
                  ]}
                  onPress={() => setIsAM(false)}
                >
                  <Text
                    style={[
                      styles.amPmText,
                      !isAM && styles.amPmTextSelected,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
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
  const [endTime, setEndTime] = useState(schedule?.endTime ?? '17:00');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setEnabled(schedule?.enabled ?? true);
      setDays(schedule?.days ?? [1, 2, 3, 4, 5]);
      setStartTime(schedule?.startTime ?? '09:00');
      setEndTime(schedule?.endTime ?? '17:00');
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
      endTime,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Edit Schedule' : 'New Schedule'}</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
            <View style={styles.enabledRow}>
              <View style={styles.enabledInfo}>
                <Text style={styles.enabledLabel}>Schedule Active</Text>
                <Text style={styles.enabledDescription}>
                  Enable or disable this schedule
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Days</Text>
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Time Range</Text>
            <View style={styles.timeRangeRow}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.timeLabel}>Start</Text>
                <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
              </TouchableOpacity>

              <View style={styles.timeArrow}>
                <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
              </View>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.timeLabel}>End</Text>
                <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>

            {parseInt(startTime.split(':')[0]) > parseInt(endTime.split(':')[0]) && (
              <View style={styles.overnightBadge}>
                <Ionicons name="moon-outline" size={14} color="#6366f1" />
                <Text style={styles.overnightText}>Overnight schedule</Text>
              </View>
            )}
          </View>

          {isEditing && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={styles.deleteButtonText}>Delete Schedule</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <TimePicker
          visible={showStartPicker}
          value={startTime}
          title="Start Time"
          onSelect={setStartTime}
          onClose={() => setShowStartPicker(false)}
        />

        <TimePicker
          visible={showEndPicker}
          value={endTime}
          title="End Time"
          onSelect={setEndTime}
          onClose={() => setShowEndPicker(false)}
        />
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  enabledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enabledInfo: {
    flex: 1,
    marginRight: 16,
  },
  enabledLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  enabledDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
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
  timeArrow: {
    paddingHorizontal: 12,
  },
  overnightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    gap: 6,
  },
  overnightText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 8,
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
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeColumnLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  timeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 132,
    gap: 4,
  },
  timeOptionsSmall: {
    gap: 4,
  },
  timeOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  timeOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  amPmColumn: {
    gap: 4,
  },
  amPmOption: {
    width: 48,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amPmOptionSelected: {
    backgroundColor: '#3b82f6',
  },
  amPmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  amPmTextSelected: {
    color: '#fff',
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
