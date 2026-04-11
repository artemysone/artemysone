import { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VersionPill } from '@/components/VersionPill';
import { colors, radius, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { ProjectBumpType, ProjectUpdate } from '@/types/database';
import { timeSince } from '@/utils/format';
import { formatVersionLabel, nextVersion } from '@/utils/version';

type ProjectProgressSectionProps = {
  currentVersion: string;
  publishedAt: string;
  lastUpdatedAt: string;
  updates: Pick<ProjectUpdate, 'id' | 'body' | 'created_at' | 'version'>[];
  isOwnProject: boolean;
  updateText: string;
  updateError: string;
  submitting: boolean;
  bumpType: ProjectBumpType;
  onChangeBumpType: (value: ProjectBumpType) => void;
  onChangeUpdateText: (value: string) => void;
  onSubmitUpdate: () => void;
  onEditProject: () => void;
};

type BumpOption = {
  value: ProjectBumpType;
  label: string;
  hint: string;
};

const BUMP_OPTIONS: BumpOption[] = [
  { value: 'patch', label: 'Tweak', hint: 'Small fix or polish' },
  { value: 'minor', label: 'Update', hint: 'New feature or improvement' },
  { value: 'major', label: 'Release', hint: 'Big milestone' },
];

export const ProjectProgressSection = memo(function ProjectProgressSection({
  currentVersion,
  publishedAt,
  lastUpdatedAt,
  updates,
  isOwnProject,
  updateText,
  updateError,
  submitting,
  bumpType,
  onChangeBumpType,
  onChangeUpdateText,
  onSubmitUpdate,
  onEditProject,
}: ProjectProgressSectionProps) {
  const hasUpdates = updates.length > 0;

  const resolvedBumpOptions = useMemo(
    () =>
      BUMP_OPTIONS.map((option) => ({
        ...option,
        resolved: nextVersion(currentVersion, option.value),
      })),
    [currentVersion],
  );

  const previewVersion =
    resolvedBumpOptions.find((option) => option.value === bumpType)?.resolved ??
    currentVersion;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <VersionPill version={currentVersion} />
        </View>
        {isOwnProject && (
          <Pressable style={styles.editBtn} onPress={onEditProject}>
            <Ionicons name="create-outline" size={16} color={colors.text.primary} />
            <Text style={styles.editBtnText}>Edit project</Text>
          </Pressable>
        )}
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

      {isOwnProject && (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Share a milestone, ship note, or small win..."
            placeholderTextColor={colors.text.tertiary}
            value={updateText}
            onChangeText={onChangeUpdateText}
            multiline
            maxLength={500}
          />

          <View style={styles.bumpPicker}>
            {resolvedBumpOptions.map((option) => {
              const isSelected = option.value === bumpType;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.bumpOption, isSelected && styles.bumpOptionSelected]}
                  onPress={() => onChangeBumpType(option.value)}
                >
                  <Text
                    style={[styles.bumpLabel, isSelected && styles.bumpLabelSelected]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[styles.bumpVersion, isSelected && styles.bumpVersionSelected]}
                  >
                    {formatVersionLabel(option.resolved)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {updateError ? <Text style={styles.errorText}>{updateError}</Text> : null}

          <Pressable
            style={[styles.submitBtn, (!updateText.trim() || submitting) && styles.submitBtnDisabled]}
            onPress={onSubmitUpdate}
            disabled={!updateText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                Post {formatVersionLabel(previewVersion)}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {!hasUpdates && isOwnProject && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No updates yet</Text>
          <Text style={styles.emptyText}>
            Post your first milestone to show how this project is evolving.
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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.input,
  },
  editBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
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
  composer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  input: {
    minHeight: 88,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.primary,
    textAlignVertical: 'top',
  },
  bumpPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  bumpOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.bg,
    alignItems: 'center',
    gap: 2,
  },
  bumpOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  bumpLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  bumpLabelSelected: {
    color: colors.accent,
  },
  bumpVersion: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 0.3,
  },
  bumpVersionSelected: {
    color: colors.accent,
  },
  errorText: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.liked,
  },
  submitBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#fff',
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
