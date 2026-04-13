import { memo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { ProjectMediaPreview } from './ProjectMediaPreview';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { formatCount, timeSince } from '@/utils/format';
import type { ProjectWithDetails } from '@/types/database';

const FEED_CONTENT_PAD = spacing.lg;

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

export const ProjectCard = memo(function ProjectCard({
  project,
  onLike,
  onShare,
  onPress,
  onAuthorPress,
}: ProjectCardProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const { profiles: author } = project;
  const acceptedCollabs =
    project.collaborators?.filter((c) => c.status === 'accepted') ?? [];

  return (
    <View style={styles.card}>
      {/* Author */}
      <View style={styles.header}>
        <Pressable style={styles.authorTap} onPress={onAuthorPress}>
          <Avatar uri={author.avatar_url} name={author.name} size="sm" />
          <View style={styles.headerInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{author.name}</Text>
              <Ionicons name="checkmark-circle" size={16} color={colors.verified} />
            </View>
            <Text style={styles.headerMeta}>
              @{author.handle} · {timeSince(project.created_at)}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Media */}
      <ProjectMediaPreview
        project={project}
        fallback="icon"
        aspectRatio={4 / 5}
        playButtonSize={60}
        borderRadius={0}
        showFormatBadge={false}
        isInlineVideoActive={project.media_type === 'video' && isVideoPlaying}
        onPlayPress={() => setIsVideoPlaying(true)}
        onPress={onPress}
      />

      {/* Caption + Actions row */}
      <View style={styles.captionActionsRow}>
        <View style={styles.captionWrap}>
          <Text style={styles.title}>{project.title}</Text>
          {!!project.description && (
            <Text style={styles.description} numberOfLines={2}>
              {project.description}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={onLike}>
            <Ionicons
              name={project.user_has_liked ? 'heart' : 'heart-outline'}
              size={22}
              color={project.user_has_liked ? colors.liked : colors.text.primary}
            />
            <Text style={styles.actionCount}>
              {project.like_count > 0 ? formatCount(project.like_count) : ' '}
            </Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={onPress}>
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={colors.text.primary}
            />
            <Text style={styles.actionCount}>
              {project.comment_count > 0 ? formatCount(project.comment_count) : ' '}
            </Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={onShare}>
            <Ionicons
              name="share-outline"
              size={20}
              color={colors.text.primary}
            />
          </Pressable>
        </View>
      </View>

      {/* Collaborators */}
      {acceptedCollabs.length > 0 && (
        <View style={styles.collabRow}>
          <View style={styles.avatarStack}>
            {acceptedCollabs.slice(0, 3).map((collab, i) => (
              <View
                key={collab.user_id}
                style={[styles.stackedAvatar, i > 0 && { marginLeft: -8 }]}
              >
                <Avatar
                  uri={collab.profiles.avatar_url}
                  name={collab.profiles.name}
                  containerSize={22}
                />
              </View>
            ))}
          </View>
          <Text style={styles.collabText}>
            {acceptedCollabs.length} collaborator
            {acceptedCollabs.length !== 1 ? 's' : ''} · Verified
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FEED_CONTENT_PAD,
    paddingVertical: 8,
  },
  authorTap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  headerMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  captionActionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: 8,
    gap: spacing.md,
  },
  captionWrap: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  actionCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text.primary,
    minWidth: 14,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text.primary,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: 4,
  },
  collabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FEED_CONTENT_PAD,
    marginTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: colors.card,
    borderRadius: 999,
  },
  collabText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
