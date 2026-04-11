import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { VersionPill } from '@/components/VersionPill';
import { colors, radius, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { ProjectUpdate } from '@/types/database';
import { timeSince } from '@/utils/format';

type ProjectProgressSectionProps = {
  currentVersion: string;
  publishedAt: string;
  lastUpdatedAt: string;
  updates: Pick<ProjectUpdate, 'id' | 'body' | 'created_at' | 'version'>[];
  isOwnProject: boolean;
};

export const ProjectProgressSection = memo(function ProjectProgressSection({
  currentVersion,
  publishedAt,
  lastUpdatedAt,
  updates,
  isOwnProject,
}: ProjectProgressSectionProps) {
  const hasUpdates = updates.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <VersionPill version={currentVersion} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Published</Text>
          <Text style={styles.metaValue}>{timeSince(publishedAt)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Last updated</Text>
          <Text style={styles.metaValue}>{timeSince(lastUpdatedAt)}</Text>
        </View>
      </View>

      {!hasUpdates && isOwnProject && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No updates yet</Text>
          <Text style={styles.emptyText}>
            Tap the edit icon in the header to post your first milestone.
          </Text>
        </View>
      )}

      {hasUpdates && (
        <View style={styles.timeline}>
          {updates.map((update, index) => (
            <View key={update.id} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />
                {index !== updates.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <VersionPill version={update.version} size="sm" />
                  <Text style={styles.timelineTime}>{timeSince(update.created_at)}</Text>
                </View>
                <Text style={styles.timelineBody}>{update.body}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
  },
  metaValue: {
    marginTop: 4,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  emptyState: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  emptyText: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  timeline: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timelineRail: {
    width: 18,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 10,
    backgroundColor: colors.border,
  },
  timelineDotActive: {
    backgroundColor: colors.accent,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: colors.borderLight,
  },
  timelineCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  timelineTime: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
  },
  timelineBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
  },
});
