import React from 'react';
import { View, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import { Colors } from '@/constants/colors';
import { SharedStyles } from '@/constants/styles';
import { ImagePreview } from '@/app/components/ImagePreview';
import { Avatar } from '@/app/components/Avatar';

interface ActivityCardProps {
  initials: string;
  name: string;
  timestamp: string;
  title: string;
  sessions: number;
  totalHours: string;
  images?: ImageSourcePropType[];
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  initials,
  name,
  timestamp,
  title,
  sessions,
  totalHours,
  images,
}) => {
  return (
    <View style={[SharedStyles.card, styles.card]}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar initials={initials} size={42} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Session</Text>
          <Text style={styles.statValue}>{sessions}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Total Hours</Text>
          <Text style={styles.statValue}>{totalHours}</Text>
        </View>
      </View>

      {/* Images */}
      {images && images.length > 0 && (
        <ImagePreview sources={images} />
      )}
    </View>
  );
};

export default ActivityCard;

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.1,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
});