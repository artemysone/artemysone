import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '@/contexts/AuthContext';
import { getProject } from '@/services/projects';
import { getProjectMedia } from '@/services/projectMedia';
import { toggleLike, toggleFollow, getFollowStatus } from '@/services/feed';
import { getComments, addComment, deleteComment } from '@/services/comments';
import { Avatar } from '@/components/Avatar';
import { TagChip } from '@/components/TagChip';
import { MediaCarousel } from '@/components/MediaCarousel';
import { ErrorState } from '@/components/ErrorState';
import { formatCount, timeSince } from '@/utils/format';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { shareProject } from '@/utils/share';
import { isValidExternalUrl } from '@/utils/validation';
import type { ProjectWithDetails, ProjectMedia, CommentWithProfile } from '@/types/database';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [mediaItems, setMediaItems] = useState<ProjectMedia[]>([]);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  // ---------- Load data ----------

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setError(false);
    setLoading(true);
    try {
      const [projectData, commentsData, mediaData] = await Promise.all([
        getProject(id, user?.id),
        getComments(id),
        getProjectMedia(id),
      ]);
      setProject(projectData);
      setComments(commentsData);
      setMediaItems(mediaData);

      if (user && projectData) {
        const following = await getFollowStatus(user.id, projectData.profiles.id);
        setIsFollowing(following);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // ---------- Actions ----------

  const projectId = project?.id;
  const authorId = project?.profiles?.id;

  const handleLike = useCallback(() => {
    if (!user || !projectId) return;

    setProject((prev) =>
      prev
        ? {
            ...prev,
            user_has_liked: !prev.user_has_liked,
            like_count: prev.user_has_liked ? prev.like_count - 1 : prev.like_count + 1,
          }
        : prev,
    );

    toggleLike(user.id, projectId).catch(() => {
      setProject((prev) =>
        prev
          ? {
              ...prev,
              user_has_liked: !prev.user_has_liked,
              like_count: prev.user_has_liked ? prev.like_count - 1 : prev.like_count + 1,
            }
          : prev,
      );
    });
  }, [user, projectId]);

  const handleFollow = useCallback(() => {
    if (!user || !authorId) return;

    setIsFollowing((prev) => !prev);

    toggleFollow(user.id, authorId).catch(() => {
      setIsFollowing((prev) => !prev);
    });
  }, [user, authorId]);

  const handleAddComment = useCallback(async () => {
    if (!user || !id || !commentText.trim()) return;

    setSubmitting(true);
    try {
      const newComment = await addComment(user.id, id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      // Update comment count
      setProject((prev) =>
        prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev,
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  }, [user, id, commentText]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteComment(commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setProject((prev) =>
          prev ? { ...prev, comment_count: prev.comment_count - 1 } : prev,
        );
      } catch (err) {
        console.error('Failed to delete comment:', err);
      }
    },
    [],
  );

  const handleShare = useCallback(async () => {
    if (!project) return;
    await shareProject(project.title, project.profiles.handle, project.id);
  }, [project]);

  const openExternalLink = useCallback(async (url: string) => {
    if (!isValidExternalUrl(url)) return;
    await WebBrowser.openBrowserAsync(url);
  }, []);

  // ---------- Derived ----------

  const tags = project?.project_tags?.map((pt) => pt.tags) ?? [];
  const collabs = project?.collaborators ?? [];
  const author = project?.profiles;
  const isOwnProject = user?.id === project?.user_id;

  // ---------- Render ----------

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </Pressable>
      <Text style={styles.headerTitle}>Project</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <ErrorState onRetry={fetchProject} />
      </SafeAreaView>
    );
  }

  if (!project || !author) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Project not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Media */}
          <MediaCarousel
            items={mediaItems}
            fallbackProject={project}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={handleLike}>
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
            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Title + Description */}
          <View style={styles.body}>
            <Text style={styles.title}>{project.title}</Text>
            <Text style={styles.description}>{project.description}</Text>
          </View>

          {/* Links */}
          {(project.demo_url || project.repo_url) && (
            <View style={styles.linksSection}>
              {project.demo_url && (
                <Pressable
                  style={styles.linkRow}
                  onPress={() => openExternalLink(project.demo_url!)}
                >
                  <Ionicons name="globe-outline" size={18} color={colors.accent} />
                  <Text style={styles.linkText} numberOfLines={1}>Live Demo</Text>
                </Pressable>
              )}
              {project.repo_url && (
                <Pressable
                  style={styles.linkRow}
                  onPress={() => openExternalLink(project.repo_url!)}
                >
                  <Ionicons name="logo-github" size={18} color={colors.accent} />
                  <Text style={styles.linkText} numberOfLines={1}>Source Code</Text>
                </Pressable>
              )}
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

          {/* Author */}
          <Pressable
            style={styles.authorSection}
            onPress={() => router.push(`/user/${author.id}`)}
          >
            <Avatar uri={author.avatar_url} name={author.name} size="md" showRing />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{author.name}</Text>
              <Text style={styles.authorHandle}>@{author.handle}</Text>
            </View>
            {!isOwnProject && (
              <Pressable
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={handleFollow}
              >
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            )}
          </Pressable>

          {/* Collaborators */}
          {collabs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Collaborators</Text>
              <View style={styles.collabList}>
                {collabs.map((c) => (
                  <Pressable
                    key={`${c.project_id}-${c.user_id}`}
                    style={styles.collabItem}
                    onPress={() => router.push(`/user/${c.user_id}`)}
                  >
                    <Avatar uri={c.profiles.avatar_url} name={c.profiles.name} size="sm" />
                    <View style={styles.collabInfo}>
                      <Text style={styles.collabName}>{c.profiles.name}</Text>
                      <Text style={styles.collabRole}>{c.role}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Comments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Comments{comments.length > 0 ? ` (${comments.length})` : ''}
            </Text>

            {comments.length === 0 && (
              <Text style={styles.noComments}>No comments yet. Be the first!</Text>
            )}

            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Pressable onPress={() => router.push(`/user/${comment.user_id}`)}>
                  <Avatar
                    uri={comment.profiles.avatar_url}
                    name={comment.profiles.name}
                    size="sm"
                  />
                </Pressable>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.profiles.name}</Text>
                    <Text style={styles.commentTime}>{timeSince(comment.created_at)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
                {user?.id === comment.user_id && (
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteComment(comment.id)}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.text.tertiary} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={colors.text.tertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },

  // Loading / Empty
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.secondary,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: spacing.sm,
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

  // Body
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 21,
  },

  // Links
  linksSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  linkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent,
    flex: 1,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },

  // Author
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text.primary,
  },
  authorHandle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
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

  // Sections
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  // Collaborators
  collabList: {
    gap: spacing.sm,
  },
  collabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  collabInfo: {
    flex: 1,
  },
  collabName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  collabRole: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Comments
  noComments: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.tertiary,
    paddingVertical: spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  commentAuthor: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  commentTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  commentText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  deleteBtn: {
    padding: spacing.xs,
    alignSelf: 'flex-start',
  },

  // Comment Input
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.input,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.text.tertiary,
  },
});
