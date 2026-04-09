import { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { TagChip } from './TagChip';
import { CollaboratorStack } from './CollaboratorStack';
import { ProjectMediaPreview } from './ProjectMediaPreview';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { formatCount, timeSince } from '@/utils/format';
import type { ProjectWithDetails } from '@/types/database';

interface ProjectCardProps {
  project: ProjectWithDetails;
  isFollowing?: boolean;
  isOwnProject?: boolean;
  onLike?: () => void;
  onFollow?: () => void;
  onShare?: () => void;
  onPress?: () => void;
  onAuthorPress?: () => void;
}

type ProjectCardProject = ProjectWithDetails & {
  tech_stack?: string[] | null;
  collaborator_status?: string | null;
};

function getProjectFormatLabel(project: ProjectWithDetails) {
  const mediaCount = project.project_media?.length ?? 0;
  if (project.media_type === 'video') return 'Video';
  if (mediaCount > 1) return 'Gallery';
  return 'Image';
}

function getTechStack(project: ProjectCardProject) {
  const stack = project.tech_stack;
  if (!Array.isArray(stack)) return [];
  return stack.map((item) => item.trim()).filter(Boolean).slice(0, 4);
}

export const ProjectCard = memo(function ProjectCard({
  project,
  isFollowing,
  isOwnProject,
  onLike,
  onFollow,
  onShare,
  onPress,
  onAuthorPress,
}: ProjectCardProps) {
  const richProject = project as ProjectCardProject;
  const { profiles: author } = project;
  const tags = project.project_tags?.map((pt) => pt.tags) ?? [];
  const techStack = getTechStack(richProject);
  const collabs = project.collaborators
    ?.filter((c) => (c as { status?: string }).status !== 'rejected')
    .map((c) => ({
      name: c.profiles.name,
      avatar_url: c.profiles.avatar_url,
      status: (c as { status?: string }).status ?? 'accepted',
    })) ?? [];
  const pendingCount = collabs.filter((c) => c.status === 'pending').length;
  const collaboratorCount = collabs.length;
  const formatLabel = getProjectFormatLabel(project);
  const mediaCount = project.project_media?.length ?? 0;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.authorTap} onPress={onAuthorPress}>
          <Avatar uri={author.avatar_url} name={author.name} size="md" />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{author.name}</Text>
            <Text style={styles.meta}>@{author.handle} · {timeSince(project.created_at)}</Text>
          </View>
        </Pressable>
        {!isOwnProject && (
          <Pressable style={[styles.followBtn, isFollowing && styles.followBtnActive]} onPress={onFollow}>
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </View>

      <ProjectMediaPreview
        project={project}
        fallback="icon"
        aspectRatio={4 / 3}
        playButtonSize={56}
        borderRadius={14}
      />

      <View style={styles.signalRow}>
        <View style={styles.signalChip}>
          <Ionicons
            name={project.media_type === 'video' ? 'play' : 'images'}
            size={12}
            color={colors.accent}
          />
          <Text style={styles.signalText}>{formatLabel}</Text>
        </View>
        {mediaCount > 1 && (
          <View style={styles.signalChip}>
            <Ionicons name="layers-outline" size={12} color={colors.accent} />
            <Text style={styles.signalText}>{mediaCount} frames</Text>
          </View>
        )}
        {collaboratorCount > 0 && (
          <View style={styles.signalChip}>
            <Ionicons name="people-outline" size={12} color={colors.accent} />
            <Text style={styles.signalText}>{collaboratorCount} collaborator{collaboratorCount === 1 ? '' : 's'}</Text>
          </View>
        )}
        {pendingCount > 0 && (
          <View style={[styles.signalChip, styles.pendingChip]}>
            <Ionicons name="time-outline" size={12} color={colors.text.secondary} />
            <Text style={styles.pendingText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onLike}>
          <Ionicons
            name={project.user_has_liked ? 'heart' : 'heart-outline'}
            size={22}
            color={project.user_has_liked ? '#E25555' : colors.text.primary}
          />
          <Text style={styles.actionText}>{formatCount(project.like_count)}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.text.primary} />
          <Text style={styles.actionText}>{formatCount(project.comment_count)}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.desc} numberOfLines={3}>
          {project.description}
        </Text>
      </View>

      {techStack.length > 0 && (
        <View style={styles.stackRow}>
          {techStack.map((item) => (
            <TagChip key={item} label={item} />
          ))}
        </View>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <TagChip key={tag.id} label={tag.name} />
          ))}
        </View>
      )}

      {/* Collaborators */}
      {collabs.length > 0 && (
        <View style={styles.collabRow}>
          <CollaboratorStack collaborators={collabs} />
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    marginBottom: spacing.md,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 12,
    gap: 10,
  },
  authorTap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  followBtnActive: {
    backgroundColor: colors.accentSoft,
  },
  followBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent,
  },
  followBtnTextActive: {
    color: colors.accent,
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 4,
  },
  signalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
  },
  signalText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pendingChip: {
    backgroundColor: colors.input,
  },
  pendingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.primary,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 6,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
  },
  stackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  collabRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
});
