import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { searchProfiles } from '@/services/profiles';
import { getTags } from '@/services/tags';
import { Avatar } from '@/components/Avatar';
import { CollaboratorChip } from '@/components/CollaboratorChip';
import { MediaUploadArea } from '@/components/MediaUploadArea';
import { TagChip } from '@/components/TagChip';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { isValidExternalUrl, normalizeExternalUrl } from '@/utils/validation';
import type { Profile, ProjectMediaFormat, Tag } from '@/types/database';

export interface ProjectFormMediaItem {
  uri: string;
  type: 'image' | 'video';
  durationMs?: number | null;
  source?: 'local' | 'remote';
}

export interface ProjectFormCollaborator {
  user_id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  role: string;
}

export interface ProjectFormSubmission {
  projectFormat: ProjectMediaFormat;
  title: string;
  description: string;
  demoUrl: string;
  repoUrl: string;
  techStack: string[];
  mediaItems: ProjectFormMediaItem[];
  selectedTagIds: string[];
  collaborators: ProjectFormCollaborator[];
}

export interface ProjectFormInitialValues {
  projectFormat?: ProjectMediaFormat;
  title?: string;
  description?: string;
  demoUrl?: string;
  repoUrl?: string;
  techStack?: string[];
  mediaItems?: ProjectFormMediaItem[];
  selectedTagIds?: string[];
  collaborators?: ProjectFormCollaborator[];
}

export interface ProjectFormProps {
  initialValues?: ProjectFormInitialValues;
  submitLabel: string;
  allowCollaborators?: boolean;
  collaboratorHelperText?: string;
  onSubmit: (values: ProjectFormSubmission) => Promise<void>;
}

const MAX_GALLERY_IMAGES = 5;
const MAX_VIDEO_SECONDS = 10;
const DEFAULT_PROJECT_FORMAT: ProjectMediaFormat = 'gallery';

const FORMAT_COPY: Record<ProjectMediaFormat, { title: string; subtext: string; helper: string; limit: string }> = {
  video: {
    title: 'Demo video',
    subtext: `One clip up to ${MAX_VIDEO_SECONDS}s`,
    helper: 'Keep it to one clip and let the work speak for itself.',
    limit: `Video demo clips are capped at ${MAX_VIDEO_SECONDS} seconds.`,
  },
  gallery: {
    title: 'Image gallery',
    subtext: `1 to ${MAX_GALLERY_IMAGES} images`,
    helper: 'Use a short sequence of images to show the project clearly.',
    limit: `Image galleries can include up to ${MAX_GALLERY_IMAGES} images.`,
  },
};

function getMaxMediaItems(format: ProjectMediaFormat) {
  return format === 'video' ? 1 : MAX_GALLERY_IMAGES;
}

function parseTechStack(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getMediaValidationMessage(format: ProjectMediaFormat, items: ProjectFormMediaItem[]): string | null {
  if (items.length === 0) {
    return format === 'video'
      ? `Add a demo video up to ${MAX_VIDEO_SECONDS} seconds.`
      : `Add between 1 and ${MAX_GALLERY_IMAGES} images.`;
  }

  if (format === 'video') {
    if (items.length !== 1) return 'Demo videos must be a single clip.';
    if (items[0]?.type !== 'video') return 'Use one video clip for this project.';
    if ((items[0]?.durationMs ?? 0) > MAX_VIDEO_SECONDS * 1000) {
      return `Keep demo videos to ${MAX_VIDEO_SECONDS} seconds or less.`;
    }
    return null;
  }

  if (items.length > MAX_GALLERY_IMAGES) {
    return `Image galleries can contain up to ${MAX_GALLERY_IMAGES} images.`;
  }

  if (items.some((item) => item.type !== 'image')) {
    return 'Use images only for image galleries.';
  }

  return null;
}

function createDefaultValues(initialValues?: ProjectFormInitialValues) {
  return {
    projectFormat: initialValues?.projectFormat ?? DEFAULT_PROJECT_FORMAT,
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    demoUrl: initialValues?.demoUrl ?? '',
    repoUrl: initialValues?.repoUrl ?? '',
    techStackInput: initialValues?.techStack?.join(', ') ?? '',
    mediaItems: initialValues?.mediaItems ?? [],
    selectedTagIds: initialValues?.selectedTagIds ?? [],
    collaborators: initialValues?.collaborators ?? [],
  };
}

export function ProjectForm({
  initialValues,
  submitLabel,
  allowCollaborators = true,
  collaboratorHelperText,
  onSubmit,
}: ProjectFormProps) {
  const { user } = useAuth();
  const defaults = createDefaultValues(initialValues);
  const [projectFormat, setProjectFormat] = useState<ProjectMediaFormat>(
    defaults.projectFormat,
  );
  const [title, setTitle] = useState(defaults.title);
  const [description, setDescription] = useState(defaults.description);
  const [demoUrl, setDemoUrl] = useState(defaults.demoUrl);
  const [repoUrl, setRepoUrl] = useState(defaults.repoUrl);
  const [techStackInput, setTechStackInput] = useState(defaults.techStackInput);
  const [mediaItems, setMediaItems] = useState<ProjectFormMediaItem[]>(defaults.mediaItems);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaults.selectedTagIds);
  const [collaborators, setCollaborators] = useState<ProjectFormCollaborator[]>(defaults.collaborators);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collabQuery, setCollabQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [lastCompletedCollabQuery, setLastCompletedCollabQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setProjectFormat(defaults.projectFormat);
    setTitle(defaults.title);
    setDescription(defaults.description);
    setDemoUrl(defaults.demoUrl);
    setRepoUrl(defaults.repoUrl);
    setTechStackInput(defaults.techStackInput);
    setMediaItems(defaults.mediaItems);
    setSelectedTagIds(defaults.selectedTagIds);
    setCollaborators(defaults.collaborators);
    setCollabQuery('');
    setSearchResults([]);
    setSearching(false);
    setLastCompletedCollabQuery('');
    setSubmitError('');
  }, [initialValues]);

  useEffect(() => {
    getTags()
      .then(setTags)
      .catch((err) => console.error('Failed to load tags:', err));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = collabQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setLastCompletedCollabQuery('');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProfiles(trimmed, 6);
        const addedIds = new Set(collaborators.map((c) => c.user_id));
        setSearchResults(
          results.filter((profile) => profile.id !== user?.id && !addedIds.has(profile.id)),
        );
        setLastCompletedCollabQuery(trimmed);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [collabQuery, collaborators, user?.id]);

  const trimmedCollabQuery = collabQuery.trim();
  const showCollabDropdown =
    searching ||
    searchResults.length > 0 ||
    (trimmedCollabQuery.length >= 2 && lastCompletedCollabQuery === trimmedCollabQuery);

  const launchPicker = useCallback(async (format: ProjectMediaFormat): Promise<ProjectFormMediaItem | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        format === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      videoMaxDuration: MAX_VIDEO_SECONDS,
    });
    if (result.canceled || result.assets.length === 0) return null;
    const asset = result.assets[0];
    const type: 'image' | 'video' =
      asset.type === 'video' || (asset.duration != null && asset.duration > 0) ? 'video' : 'image';
    if (format === 'video') {
      const durationMs = asset.duration ?? null;
      if (durationMs != null && durationMs > MAX_VIDEO_SECONDS * 1000) {
        Alert.alert('Video too long', `Keep demo videos to ${MAX_VIDEO_SECONDS} seconds or less.`);
        return null;
      }
      if (type !== 'video') return null;
      return { uri: asset.uri, type: 'video', durationMs, source: 'local' };
    }

    if (type !== 'image') return null;
    return { uri: asset.uri, type: 'image', source: 'local' };
  }, []);

  const pickMedia = useCallback(async () => {
    if (projectFormat === 'video' && mediaItems.length >= 1) {
      Alert.alert(
        'Limit reached',
        `Demo videos are limited to one clip of up to ${MAX_VIDEO_SECONDS} seconds.`,
      );
      return;
    }

    if (projectFormat === 'gallery' && mediaItems.length >= MAX_GALLERY_IMAGES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_GALLERY_IMAGES} images.`);
      return;
    }

    const picked = await launchPicker(projectFormat);
    if (picked) setMediaItems((prev) => [...prev, picked]);
  }, [launchPicker, mediaItems.length, projectFormat]);

  const replacePrimaryMedia = useCallback(async () => {
    const picked = await launchPicker(projectFormat);
    if (picked) setMediaItems((prev) => [picked, ...prev.slice(1)]);
  }, [launchPicker, projectFormat]);

  const removeMedia = useCallback((index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFormatChange = useCallback((format: ProjectMediaFormat) => {
    setProjectFormat(format);
    setMediaItems([]);
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }, []);

  const addCollaborator = useCallback((profile: Profile) => {
    setCollaborators((prev) => [
      ...prev,
      {
        user_id: profile.id,
        name: profile.name,
        handle: profile.handle,
        avatar_url: profile.avatar_url,
        role: '',
      },
    ]);
    setCollabQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }, []);

  const removeCollaborator = useCallback((userId: string) => {
    setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitError('');
    Keyboard.dismiss();

    if (!title.trim()) {
      setSubmitError('Give your project a name.');
      return;
    }

    const mediaValidationMessage = getMediaValidationMessage(projectFormat, mediaItems);
    if (mediaValidationMessage) {
      setSubmitError(mediaValidationMessage);
      return;
    }

    const normalizedDemoUrl = normalizeExternalUrl(demoUrl);
    if (normalizedDemoUrl && !isValidExternalUrl(normalizedDemoUrl)) {
      setSubmitError('Use a full http or https URL for the demo link.');
      return;
    }

    const normalizedRepoUrl = normalizeExternalUrl(repoUrl);
    if (normalizedRepoUrl && !isValidExternalUrl(normalizedRepoUrl)) {
      setSubmitError('Use a full http or https URL for the repository link.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        projectFormat,
        title: title.trim(),
        description: description.trim(),
        demoUrl: normalizedDemoUrl || '',
        repoUrl: normalizedRepoUrl || '',
        techStack: parseTechStack(techStackInput),
        mediaItems,
        selectedTagIds,
        collaborators,
      });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    collaborators,
    demoUrl,
    description,
    mediaItems,
    onSubmit,
    projectFormat,
    repoUrl,
    selectedTagIds,
    techStackInput,
    title,
  ]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="always"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Project Format</Text>
        <View style={styles.formatToggle}>
          <Pressable
            style={[styles.formatOption, projectFormat === 'video' && styles.formatOptionActive]}
            onPress={() => handleFormatChange('video')}
          >
            <Text
              style={[
                styles.formatOptionText,
                projectFormat === 'video' && styles.formatOptionTextActive,
              ]}
            >
              {FORMAT_COPY.video.title}
            </Text>
            <Text style={styles.formatOptionSubtext}>{FORMAT_COPY.video.subtext}</Text>
          </Pressable>
          <Pressable
            style={[styles.formatOption, projectFormat === 'gallery' && styles.formatOptionActive]}
            onPress={() => handleFormatChange('gallery')}
          >
            <Text
              style={[
                styles.formatOptionText,
                projectFormat === 'gallery' && styles.formatOptionTextActive,
              ]}
            >
              {FORMAT_COPY.gallery.title}
            </Text>
            <Text style={styles.formatOptionSubtext}>{FORMAT_COPY.gallery.subtext}</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>{FORMAT_COPY[projectFormat].helper}</Text>
      </View>

      <View style={styles.field}>
        {mediaItems.length === 0 ? (
          <MediaUploadArea onPress={pickMedia} />
        ) : (
          <>
            <MediaUploadArea
              onPress={replacePrimaryMedia}
              selectedUri={mediaItems[0].uri}
              mediaType={mediaItems[0].type}
            />
            <View style={styles.mediaThumbs}>
              {mediaItems.slice(1).map((item, idx) => (
                <View key={`${item.uri}-${idx}`} style={styles.thumbContainer}>
                  <Image source={{ uri: item.uri }} style={styles.thumbImage} contentFit="cover" />
                  <Pressable style={styles.thumbRemove} onPress={() => removeMedia(idx + 1)}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </Pressable>
                  {item.type === 'video' && (
                    <View style={styles.thumbVideoBadge}>
                      <Ionicons name="videocam" size={10} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
              {mediaItems.length < getMaxMediaItems(projectFormat) && (
                <Pressable style={styles.addMoreBtn} onPress={pickMedia}>
                  <Ionicons name="add" size={24} color={colors.text.tertiary} />
                </Pressable>
              )}
            </View>
          </>
        )}
        <Text style={styles.helperText}>{FORMAT_COPY[projectFormat].limit}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Project Title</Text>
        <TextInput
          style={styles.input}
          placeholder="What did you build?"
          placeholderTextColor={colors.text.tertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Tell the story behind this project..."
          placeholderTextColor={colors.text.tertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Demo URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://your-project.com"
          placeholderTextColor={colors.text.tertiary}
          value={demoUrl}
          onChangeText={setDemoUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Repository URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://github.com/you/project"
          placeholderTextColor={colors.text.tertiary}
          value={repoUrl}
          onChangeText={setRepoUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tech Stack</Text>
        <TextInput
          style={styles.input}
          placeholder="React Native, Supabase, TypeScript"
          placeholderTextColor={colors.text.tertiary}
          value={techStackInput}
          onChangeText={setTechStackInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.helperText}>
          Separate technologies with commas. Keep it factual and specific.
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              label={tag.name}
              selected={selectedTagIds.includes(tag.id)}
              onPress={() => toggleTag(tag.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Collaborators</Text>
        {allowCollaborators ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Search people to tag..."
              placeholderTextColor={colors.text.tertiary}
              value={collabQuery}
              onChangeText={setCollabQuery}
            />

            {showCollabDropdown && (
              <View style={styles.searchDropdown}>
                {searching && searchResults.length === 0 ? (
                  <View style={styles.searchLoading}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                ) : searchResults.length === 0 ? (
                  <View style={styles.searchEmpty}>
                    <Text style={styles.searchEmptyTitle}>No results found</Text>
                    <Text style={styles.searchEmptyText}>Try a full name or handle</Text>
                  </View>
                ) : (
                  searchResults.map((profile) => (
                    <Pressable
                      key={profile.id}
                      style={styles.searchResult}
                      onPress={() => addCollaborator(profile)}
                    >
                      <Avatar uri={profile.avatar_url} name={profile.name} size="sm" />
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{profile.name}</Text>
                        <Text style={styles.searchResultHandle}>@{profile.handle}</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {collaborators.length > 0 && (
              <View style={styles.taggedRow}>
                {collaborators.map((collab) => (
                  <CollaboratorChip
                    key={collab.user_id}
                    name={collab.name}
                    avatarUrl={collab.avatar_url}
                    onRemove={() => removeCollaborator(collab.user_id)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {collaborators.length > 0 ? (
              <View style={styles.taggedRow}>
                {collaborators.map((collab) => (
                  <View key={collab.user_id} style={styles.readOnlyChip}>
                    <Text style={styles.readOnlyChipText}>{collab.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {collaboratorHelperText ? (
              <Text style={styles.helperText}>{collaboratorHelperText}</Text>
            ) : null}
          </>
        )}
      </View>

      {submitError ? (
        <View style={styles.submitErrorBox}>
          <Text style={styles.submitErrorText}>{submitError}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.postBtn, submitting && styles.postBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.postBtnText}>{submitLabel}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    padding: 13,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  textarea: {
    height: 100,
    paddingTop: 13,
  },
  formatToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formatOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  formatOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  formatOptionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  formatOptionTextActive: {
    color: colors.accent,
  },
  formatOptionSubtext: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  helperText: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  taggedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 10,
  },
  readOnlyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.input,
  },
  readOnlyChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text.primary,
  },
  searchDropdown: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  searchLoading: {
    padding: spacing.md,
    alignItems: 'center',
  },
  searchEmpty: {
    paddingHorizontal: 13,
    paddingVertical: spacing.md,
  },
  searchEmptyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.secondary,
  },
  searchEmptyText: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  searchResultHandle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  submitErrorBox: {
    marginBottom: spacing.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#FDF1ED',
    borderWidth: 1,
    borderColor: '#F3D2C7',
  },
  submitErrorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.accent,
    lineHeight: 18,
  },
  mediaThumbs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  thumbContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  thumbVideoBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  addMoreBtn: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  postBtnDisabled: {
    opacity: 0.6,
  },
  postBtnText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: '#fff',
  },
});
