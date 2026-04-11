import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/Pill';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { ProjectUpdate } from '@/types/database';
import { timeSince } from '@/utils/format';
import { BUMP_LABELS } from '@/utils/version';

type ProjectProgressSectionProps = {
  updates: Pick<ProjectUpdate, 'id' | 'body' | 'created_at' | 'bump_type'>[];
  isOwnProject: boolean;
};

export const ProjectProgressSection = memo(function ProjectProgressSection({
  updates,
  isOwnProject,
}: ProjectProgressSectionProps) {
  const hasUpdates = updates.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Progress</Text>

      {!hasUpdates && isOwnProject && (
        <Text style={styles.emptyText}>
          No updates yet. Tap the edit icon to post your first milestone.
        </Text>
      )}

      {hasUpdates &&
        updates.map((update, index) => {
          const isLast = index === updates.length - 1;
          const label = update.bump_type ? BUMP_LABELS[update.bump_type].toLowerCase() : null;
          return (
            <View key={update.id} style={styles.timelineItem}>
              <View style={styles.timelineContent}>
                {label && <Pill label={label} size="sm" />}
                <Text style={styles.timelineBody}>{update.body}</Text>
              </View>
              <View style={styles.timelineRail}>
                <Text style={styles.timelineTime}>{timeSince(update.created_at)}</Text>
                {!isLast && <View style={styles.timelineLine} />}
              </View>
            </View>
          );
        })}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.tertiary,
    paddingVertical: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineBody: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
  },
  timelineRail: {
    minWidth: 32,
    alignItems: 'flex-end',
    alignSelf: 'stretch',
  },
  timelineTime: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
    paddingTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
    backgroundColor: colors.borderLight,
  },
});
