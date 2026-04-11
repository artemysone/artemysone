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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '@/contexts/AuthContext';
import { getProjectUpdates } from '@/services/projectUpdates';
import { getProject } from '@/services/projects';
import { getProjectMedia } from '@/services/projectMedia';
import { toggleLike, toggleFollow, getFollowStatus } from '@/services/feed';
import { getComments, addComment, deleteComment } from '@/services/comments';
import { Avatar } from '@/components/Avatar';
import { TagChip } from '@/components/TagChip';
import { MediaCarousel } from '@/components/MediaCarousel';
import { ErrorState } from '@/components/ErrorState';
import { ProjectProgressSection } from '@/components/ProjectProgressSection';
import { ProjectEditSheet } from '@/components/ProjectEditSheet';
import { VersionPill } from '@/components/VersionPill';
import { formatCount, timeSince } from '@/utils/format';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { shareProject } from '@/utils/share';
import { isValidExternalUrl } from '@/utils/validation';
import { INITIAL_PROJECT_VERSION } from '@/utils/version';
import type {
  ProjectWithDetails,
  ProjectMedia,
  CommentWithProfile,
  ProjectUpdateWithProfile,
} from '@/types/database';

type RichProject = ProjectWithDetails & {
  tech_stack?: string[] | null;
  collaborators?: Array<ProjectWithDetails['collaborators'][number] & { status?: string }>;
};

const WIDE_BREAKPOINT = 768;
const MAX_CONTENT_WIDTH = 1100;

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= WIDE_BREAKPOINT;

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [mediaItems, setMediaItems] = useState<ProjectMedia[]>([]);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdateWithProfile[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [error, setError] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setError(false);
    setLoading(true);
    try {
      const [projectData, commentsData, mediaData, updatesData] = await Promise.all([
        getProject(id, user?.id),
        getComments(id),
        getProjectMedia(id),
        getProjectUpdates(id),
      ]);
      setProject(projectData);
      setComments(commentsData);
      setMediaItems(mediaData);
      setUpdates(updatesData);

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

  const handleUpdatePosted = useCallback((newUpdate: ProjectUpdateWithProfile) => {
    setUpdates((prev) => [newUpdate, ...prev]);
    setProject((prev) =>
      prev ? { ...prev, current_version: newUpdate.version } : prev,
    );
    setEditSheetVisible(false);
  }, []);

  const closeEditSheet = useCallback(() => {
    setEditSheetVisible(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (!project) return;
    await shareProject(project.title, project.profiles.handle, project.id);
  }, [project]);

  const openExternalLink = useCallback(async (url: string) => {
    if (!isValidExternalUrl(url)) return;
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const richProject = project as RichProject | null;
  const tags = project?.project_tags?.map((pt) => pt.tags) ?? [];
  const collabs = richProject?.collaborators?.filter((c) => c.status !== 'rejected') ?? [];
  const techStack = (richProject?.tech_stack ?? []).map((item) => item.trim()).filter(Boolean);
  const author = project?.profiles;
  const isOwnProject = user?.id === project?.user_id;
  const latestUpdateAt = updates[0]?.created_at;
  const lastUpdatedAt =
    latestUpdateAt &&
    project &&
    new Date(latestUpdateAt).getTime() > new Date(project.updated_at).getTime()
      ? latestUpdateAt
      : project?.updated_at ?? project?.created_at ?? '';
  const currentVersion = project?.current_version ?? INITIAL_PROJECT_VERSION;
  const handleEditDetails = useCallback(() => {
    if (!id) return;
    setEditSheetVisible(false);
    router.push({ pathname: '/project/[id]/edit', params: { id } });
  }, [id, router]);

  const openEditSheet = useCallback(() => {
    setEditSheetVisible(true);
  }, []);

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => author ? router.replace({ pathname: '/[handle]', params: { handle: author.handle } }) : router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </Pressable>
      <Text style={styles.headerTitle}>Project</Text>
      {isOwnProject ? (
        <Pressable onPress={openEditSheet} style={styles.headerAction}>
          <Ionicons name="create-outline" size={22} color={colors.text.primary} />
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
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

  const detailsContent = (
    <>
      <View style={[styles.body, isWide && styles.bodyWide]}>
        <View style={styles.authorActionsRow}>
          <Pressable
            style={styles.authorRow}
            onPress={() => router.push({ pathname: '/[handle]', params: { handle: author.handle } })}
          >
            <Avatar uri={author.avatar_url} name={author.name} size="sm" />
            <View style={styles.authorRowInfo}>
              <Text style={styles.authorRowName}>{author.name}</Text>
              <Text style={styles.authorRowHandle}>@{author.handle}</Text>
            </View>
          </Pressable>

          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={handleLike}>
              <Ionicons
                name={project.user_has_liked ? 'heart' : 'heart-outline'}
                size={20}
                color={project.user_has_liked ? colors.liked : colors.text.secondary}
              />
              <Text style={styles.actionText}>{formatCount(project.like_count)}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.actionText}>{formatCount(project.comment_count)}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.titleTagsRow}>
          <View style={styles.titleVersionWrap}>
            <Text style={styles.title}>{project.title}</Text>
            <VersionPill version={currentVersion} />
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <TagChip key={tag.id} label={tag.name} />
              ))}
            </View>
          )}
        </View>

        <Text style={styles.description}>{project.description}</Text>

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
      </View>

      {techStack.length > 0 && (
        <View style={[styles.stackSection, isWide && styles.sectionWide]}>
          <Text style={styles.sectionLabel}>Tech Stack</Text>
          <View style={styles.stackRow}>
            {techStack.map((item) => (
              <TagChip key={item} label={item} />
            ))}
          </View>
        </View>
      )}

      {(project.demo_url || project.repo_url) && (
        <View style={[styles.linksSection, isWide && styles.sectionWide]}>
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

      {collabs.length > 0 && (
        <View style={[styles.section, isWide && styles.sectionWide]}>
          <Text style={styles.sectionTitle}>Collaborators</Text>
          <View style={styles.collabList}>
            {collabs.map((c) => (
              <Pressable
                key={`${c.project_id}-${c.user_id}`}
                style={styles.collabItem}
                onPress={() => router.push({ pathname: '/[handle]', params: { handle: c.profiles.handle } })}
              >
                <Avatar uri={c.profiles.avatar_url} name={c.profiles.name} size="sm" />
                <View style={styles.collabInfo}>
                  <Text style={styles.collabName}>{c.profiles.name}</Text>
                  <View style={styles.collabMetaRow}>
                    {c.role ? <Text style={styles.collabRole}>{c.role}</Text> : null}
                    <View style={[styles.collabStatusChip, c.status === 'pending' && styles.collabStatusPending]}>
                      <Text style={[styles.collabStatusText, c.status === 'pending' && styles.collabStatusPendingText]}>
                        {c.status === 'pending' ? 'Pending' : 'Confirmed'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {(isOwnProject || updates.length > 0) && (
        <ProjectProgressSection
          currentVersion={currentVersion}
          publishedAt={project.created_at}
          lastUpdatedAt={lastUpdatedAt}
          updates={updates}
          isOwnProject={isOwnProject}
        />
      )}

      <View style={[styles.section, isWide && styles.sectionWide]}>
        <Text style={styles.sectionTitle}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>

        {comments.length === 0 && (
          <Text style={styles.noComments}>No comments yet. Be the first!</Text>
        )}

        {comments.map((comment) => (
          <View key={comment.id} style={styles.commentItem}>
            <Pressable onPress={() => router.push({ pathname: '/[handle]', params: { handle: comment.profiles.handle } })}>
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
    </>
  );

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
          contentContainerStyle={[
            styles.scrollContent,
            isWide && styles.scrollContentWide,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isWide ? (
            <View style={styles.twoColumn}>
              <View style={styles.mediaColumn}>
                <MediaCarousel
                  items={mediaItems}
                  fallbackProject={project}
                />
              </View>
              <View style={styles.detailsColumn}>
                {detailsContent}
              </View>
            </View>
          ) : (
            <>
              <MediaCarousel
                items={mediaItems}
                fallbackProject={project}
              />
              {detailsContent}
            </>
          )}
        </ScrollView>

        <View style={[styles.commentInputContainer, isWide && styles.commentInputWide]}>
          <View style={[styles.commentInputRow, commentFocused && styles.commentInputRowFocused]}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.text.tertiary}
              value={commentText}
              onChangeText={setCommentText}
              onFocus={() => setCommentFocused(true)}
              onBlur={() => setCommentFocused(false)}
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
        </View>
      </KeyboardAvoidingView>

      {isOwnProject && user && (
        <ProjectEditSheet
          visible={editSheetVisible}
          onClose={closeEditSheet}
          currentVersion={currentVersion}
          projectId={project.id}
          userId={user.id}
          onUpdatePosted={handleUpdatePosted}
          onEditDetails={handleEditDetails}
        />
      )}
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
  scrollContentWide: {
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },

  // Two-column layout
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  mediaColumn: {
    flex: 3,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  detailsColumn: {
    flex: 2,
    paddingTop: spacing.xs,
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
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Body
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  bodyWide: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  titleTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  titleVersionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.text.primary,
  },
  authorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  authorRowInfo: {
    flex: 1,
  },
  authorRowName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  authorRowHandle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 21,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionWide: {
    paddingHorizontal: 0,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    minWidth: 14,
  },
  stackSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  stackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  },

  followBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginTop: spacing.md,
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
  collabMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  collabRole: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
  collabStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  collabStatusPending: {
    backgroundColor: colors.input,
  },
  collabStatusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  collabStatusPendingText: {
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  commentInputWide: {
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  commentInputRowFocused: {
    borderColor: colors.accent,
  },
  commentInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.text.tertiary,
  },
});
