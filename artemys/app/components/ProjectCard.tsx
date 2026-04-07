import { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { TagChip } from './TagChip';
import { CollaboratorStack } from './CollaboratorStack';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { formatCount, timeSince } from '@/utils/format';
import type { ProjectWithDetails } from '@/types/database';

interface ProjectCardProps {
  project: ProjectWithDetails;
  isFollowing?: boolean;
  onLike?: () => void;
  onFollow?: () => void;
  onPress?: () => void;
  onAuthorPress?: () => void;
}

export const ProjectCard = memo(function ProjectCard({ project, isFollowing, onLike, onFollow, onPress, onAuthorPress }: ProjectCardProps) {
  const { profiles: author } = project;
  const tags = project.project_tags?.map((pt) => pt.tags) ?? [];
  const collabs = project.collaborators?.map((c) => ({
    name: c.profiles.name,
    avatar_url: c.profiles.avatar_url,
  })) ?? [];

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
        <Pressable style={[styles.followBtn, isFollowing && styles.followBtnActive]} onPress={onFollow}>
          <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </View>

      {/* Media */}
      {project.media_url ? (
        <Image source={{ uri: project.media_url }} style={styles.media} contentFit="cover" />
      ) : (
        <View style={[styles.media, styles.mediaPlaceholder]}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      )}

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
        <Pressable style={styles.actionBtn}>
          <Ionicons name="share-outline" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.desc} numberOfLines={3}>{project.description}</Text>
      </View>

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
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
  media: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  mediaPlaceholder: {
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: 4,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
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
