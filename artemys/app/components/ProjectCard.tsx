import { memo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { ProjectMediaPreview } from './ProjectMediaPreview';
import { colors, spacing } from '@/constants/Colors';
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const { profiles: author } = project;
  const hasDescription = !!project.description;
  const fullText = hasDescription ? `${project.title} · ${project.description}` : project.title;
  const captionPreview = fullText.slice(0, 110).trim();
  const hasLongCaption = fullText.length > captionPreview.length;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.authorTap} onPress={onAuthorPress}>
          <Avatar uri={author.avatar_url} name={author.name} size="sm" />
          <View style={styles.headerInfo}>
            <Text style={styles.authorNameRow}>
              <Text style={styles.authorName}>{author.name}</Text>
              <Text style={styles.authorHandle}> @{author.handle}</Text>
            </Text>
            <Text style={styles.headerMeta}>{timeSince(project.created_at)}</Text>
          </View>
        </Pressable>
        {!isOwnProject && (
          <Pressable onPress={onFollow}>
            <Text style={[styles.followText, isFollowing && styles.followTextActive]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
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

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <Pressable style={styles.actionBtn} onPress={onLike}>
            <Ionicons
              name={project.user_has_liked ? 'heart' : 'heart-outline'}
              size={24}
              color={project.user_has_liked ? '#E25555' : colors.text.primary}
            />
            {project.like_count > 0 && <Text style={styles.actionCount}>{formatCount(project.like_count)}</Text>}
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={onPress}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.text.primary} />
            {project.comment_count > 0 && <Text style={styles.actionCount}>{formatCount(project.comment_count)}</Text>}
          </Pressable>
        </View>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="bookmark-outline" size={22} color={colors.text.primary} />
        </Pressable>
      </View>


      {/* Caption */}
      <View style={styles.captionWrap}>
        <Text style={styles.caption} numberOfLines={2}>
          <Text style={styles.captionTitle}>{project.title}</Text>
          {hasDescription ? ` · ${project.description}` : ''}
        </Text>
        {hasLongCaption && (
          <Pressable onPress={onPress}>
            <Text style={styles.moreText}>more</Text>
          </Pressable>
        )}
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontSize: 13,
  },
  authorName: {
    fontFamily: fonts.bodySemiBold,
    color: colors.text.primary,
  },
  authorHandle: {
    fontFamily: fonts.body,
    color: colors.text.secondary,
  },
  headerMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  followText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent,
  },
  followTextActive: {
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 2,
  },
  actionCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text.primary,
  },
  captionWrap: {
    paddingHorizontal: 14,
    marginTop: 4,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 18,
  },
  captionTitle: {
    fontFamily: fonts.bodySemiBold,
  },
  moreText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
