import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createProjectUpdate } from '@/services/projectUpdates';
import { colors, radius, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { ProjectBumpType, ProjectUpdateWithProfile } from '@/types/database';
import { BUMP_LABELS, formatVersionLabel, nextVersion } from '@/utils/version';

type ProjectEditSheetProps = {
  visible: boolean;
  onClose: () => void;
  currentVersion: string;
  projectId: string;
  userId: string;
  onUpdatePosted: (update: ProjectUpdateWithProfile) => void;
  onEditDetails: () => void;
};

const BUMP_OPTIONS: { value: ProjectBumpType; label: string }[] = (
  ['patch', 'minor', 'major'] as const
).map((value) => ({ value, label: BUMP_LABELS[value] }));

export const ProjectEditSheet = memo(function ProjectEditSheet({
  visible,
  onClose,
  currentVersion,
  projectId,
  userId,
  onUpdatePosted,
  onEditDetails,
}: ProjectEditSheetProps) {
  const [updateText, setUpdateText] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bumpType, setBumpType] = useState<ProjectBumpType>('minor');

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

  const handleSubmit = useCallback(async () => {
    if (!updateText.trim()) return;
    setUpdateError('');
    setSubmitting(true);
    try {
      const newUpdate = await createProjectUpdate({
        userId,
        projectId,
        body: updateText.trim(),
        bumpType,
      });
      setUpdateText('');
      setBumpType('minor');
      onUpdatePosted(newUpdate);
    } catch (err) {
      console.error('Failed to add project update:', err);
      setUpdateError('Could not post the update. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [bumpType, onUpdatePosted, projectId, updateText, userId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>Edit project</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Post an update</Text>

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder="Share a milestone, ship note, or small win..."
                placeholderTextColor={colors.text.tertiary}
                value={updateText}
                onChangeText={setUpdateText}
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
                      onPress={() => setBumpType(option.value)}
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
                style={[
                  styles.submitBtn,
                  (!updateText.trim() || submitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
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

            <View style={styles.divider} />

            <Pressable style={styles.detailsRow} onPress={onEditDetails}>
              <View style={styles.detailsIcon}>
                <Ionicons name="create-outline" size={18} color={colors.text.primary} />
              </View>
              <View style={styles.detailsInfo}>
                <Text style={styles.detailsTitle}>Edit project details</Text>
                <Text style={styles.detailsSubtitle}>
                  Title, description, media, links, tags
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  composer: {
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
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  detailsIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsInfo: {
    flex: 1,
  },
  detailsTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  detailsSubtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
