import { memo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from './Avatar';
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
  const fullCaption = [project.title, project.description].filter(Boolean).join(' · ');
  const captionPreview = fullCaption.slice(0, 110).trim();
  const hasLongCaption = fullCaption.length > captionPreview.length;

  return (
    <View style={styles.card}>
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
        overlay={
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.82)']}
            locations={[0.45, 0.68, 1]}
            style={styles.mediaOverlay}
          >
            <View style={styles.overlayRow}>
              <Pressable style={styles.authorTap} onPress={onAuthorPress}>
                <Avatar uri={author.avatar_url} name={author.name} size="md" />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{author.name}</Text>
                  <Text style={styles.meta}>@{author.handle} · {timeSince(project.created_at)}</Text>
                </View>
              </Pressable>
              {!isOwnProject ? (
                <Pressable style={[styles.followBtn, isFollowing && styles.followBtnActive]} onPress={onFollow}>
                  <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </LinearGradient>
        }
      />

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onLike}>
          <Ionicons
            name={project.user_has_liked ? 'heart' : 'heart-outline'}
            size={22}
            color={project.user_has_liked ? '#E25555' : colors.text.primary}
          />
          {project.like_count > 0 ? <Text style={styles.actionText}>{formatCount(project.like_count)}</Text> : null}
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.text.primary} />
          {project.comment_count > 0 ? <Text style={styles.actionText}>{formatCount(project.comment_count)}</Text> : null}
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.caption} numberOfLines={2}>
          <Text style={styles.captionAuthor}>{author.name}</Text>
          <Text>{' '}{hasLongCaption ? `${captionPreview}...` : fullCaption}</Text>
        </Text>
        {hasLongCaption ? (
          <Pressable style={styles.moreBtn} onPress={onPress}>
            <Text style={styles.moreText}>... more</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#fff',
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: '#fff',
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  followBtnTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text.primary,
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  captionAuthor: {
    fontFamily: fonts.bodySemiBold,
  },
  moreBtn: {
    marginTop: 4,
  },
  moreText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text.secondary,
  },
});
