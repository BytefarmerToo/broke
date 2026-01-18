import React, { ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Profile } from '../types/Profile';

type IconName = ComponentProps<typeof Ionicons>['name'];
import { useApp } from '../context/AppContext';

interface ProfilePickerProps {
  onNewProfile: () => void;
  onEditProfile: (profile: Profile) => void;
}

const CELL_SIZE = 100;
const CELL_MARGIN = 8;

export function ProfilePicker({ onNewProfile, onEditProfile }: ProfilePickerProps) {
  const { profiles, currentProfile, setCurrentProfile } = useApp();

  const screenWidth = Dimensions.get('window').width;
  const numColumns = Math.floor((screenWidth - 32) / (CELL_SIZE + CELL_MARGIN * 2));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profiles</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {profiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            style={[
              styles.cell,
              currentProfile?.id === profile.id && styles.cellSelected,
            ]}
            onPress={() => setCurrentProfile(profile)}
            onLongPress={() => onEditProfile(profile)}
          >
            <Ionicons
              name={profile.icon as IconName}
              size={28}
              color={currentProfile?.id === profile.id ? '#fff' : '#374151'}
            />
            <Text
              style={[
                styles.cellName,
                currentProfile?.id === profile.id && styles.cellNameSelected,
              ]}
              numberOfLines={1}
            >
              {profile.name}
            </Text>
            <Text
              style={[
                styles.cellCount,
                currentProfile?.id === profile.id && styles.cellCountSelected,
              ]}
            >
              {profile.blockedApps.length} apps
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.newCell} onPress={onNewProfile}>
          <Ionicons name="add" size={28} color="#6b7280" />
          <Text style={styles.newCellText}>New</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: CELL_MARGIN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cellSelected: {
    backgroundColor: '#3b82f6',
  },
  cellName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
  },
  cellNameSelected: {
    color: '#fff',
  },
  cellCount: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  cellCountSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  newCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    margin: CELL_MARGIN,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  newCellText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 4,
  },
});
