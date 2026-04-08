import { useState, useEffect, useCallback, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { createProject, deleteProject, uploadProjectMedia } from '@/services/projects';
import { addProjectMedia } from '@/services/projectMedia';
import { createCollaboratorNotification } from '@/services/notifications';
import { searchProfiles } from '@/services/profiles';
import { getTags } from '@/services/tags';
import { AppBar } from '@/components/AppBar';
import { MediaUploadArea } from '@/components/MediaUploadArea';
import { TagChip } from '@/components/TagChip';
import { CollaboratorChip } from '@/components/CollaboratorChip';
import { Avatar } from '@/components/Avatar';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { Tag, Profile } from '@/types/database';
import { isValidExternalUrl, normalizeExternalUrl } from '@/utils/validation';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

const MAX_MEDIA = 5;

interface SelectedCollaborator {
  user_id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  role: string;
}

export default function CreateScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<SelectedCollaborator[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Tags from DB
  const [tags, setTags] = useState<Tag[]>([]);

  // Collaborator search
  const [collabQuery, setCollabQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load tags on mount
  useEffect(() => {
    getTags()
      .then(setTags)
      .catch((err) => console.error('Failed to load tags:', err));
  }, []);

  // Debounced collaborator search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = collabQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProfiles(trimmed, 6);
        // Filter out current user and already-added collaborators
        const addedIds = new Set(collaborators.map((c) => c.user_id));
        setSearchResults(
          results.filter((p) => p.id !== user?.id && !addedIds.has(p.id)),
        );
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [collabQuery, collaborators, user]);

  // ---------- Actions ----------

  const launchPicker = useCallback(async (): Promise<MediaItem | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (result.canceled || result.assets.length === 0) return null;
    const asset = result.assets[0];
    const type: 'image' | 'video' =
      asset.type === 'video' || (asset.duration != null && asset.duration > 0) ? 'video' : 'image';
    return { uri: asset.uri, type };
  }, []);

  const pickMedia = useCallback(async () => {
    if (mediaItems.length >= MAX_MEDIA) {
      Alert.alert('Limit reached', `You can add up to ${MAX_MEDIA} media items.`);
      return;
    }
    const picked = await launchPicker();
    if (picked) setMediaItems((prev) => [...prev, picked]);
  }, [mediaItems.length, launchPicker]);

  const removeMedia = useCallback((index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const replacePrimaryMedia = useCallback(async () => {
    const picked = await launchPicker();
    if (picked) setMediaItems((prev) => [picked, ...prev.slice(1)]);
  }, [launchPicker]);

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

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setDemoUrl('');
    setRepoUrl('');
    setMediaItems([]);
    setSelectedTagIds([]);
    setCollaborators([]);
    setCollabQuery('');
    setSearchResults([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user) return;

    // Validate
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your project a name.');
      return;
    }
    if (mediaItems.length === 0) {
      Alert.alert('Missing media', 'Add a demo video or screenshot.');
      return;
    }

    const normalizedDemoUrl = normalizeExternalUrl(demoUrl);
    if (normalizedDemoUrl && !isValidExternalUrl(normalizedDemoUrl)) {
      Alert.alert('Invalid demo URL', 'Use a full http or https URL for the demo link.');
      return;
    }

    const normalizedRepoUrl = normalizeExternalUrl(repoUrl);
    if (normalizedRepoUrl && !isValidExternalUrl(normalizedRepoUrl)) {
      Alert.alert('Invalid repository URL', 'Use a full http or https URL for the repository link.');
      return;
    }

    setSubmitting(true);
    let createdProjectId: string | null = null;
    try {
      const project = await createProject({
        title: title.trim(),
        description: description.trim(),
        demo_url: normalizedDemoUrl || undefined,
        repo_url: normalizedRepoUrl || undefined,
        tag_ids: selectedTagIds,
        collaborators: collaborators.map((c) => ({
          user_id: c.user_id,
          role: c.role,
        })),
      });
      createdProjectId = project.id;

      // Upload the first media item to the project row (backward compat for feed thumbnails)
      const primary = mediaItems[0];
      const { mediaUrl, thumbnailUrl } = await uploadProjectMedia(
        user.id,
        project.id,
        primary.uri,
        primary.type,
        { storageKey: 'primary', updateProject: true },
      );

      // If there are additional media items, upload them in parallel to project_media
      if (mediaItems.length > 1) {
        const uploadResults = await Promise.all(
          mediaItems.slice(1).map((item, i) =>
            uploadProjectMedia(user.id, project.id, item.uri, item.type, {
              storageKey: `media-${i + 1}`,
              updateProject: false,
            }).then((r) => ({
              mediaUrl: r.mediaUrl,
              mediaType: item.type as 'image' | 'video',
              thumbnailUrl: r.thumbnailUrl,
              sortOrder: i + 1,
            })),
          ),
        );

        await addProjectMedia(project.id, [
          { mediaUrl, mediaType: primary.type, thumbnailUrl, sortOrder: 0 },
          ...uploadResults,
        ]);
      }

      if (collaborators.length > 0) {
        await Promise.allSettled(
          collaborators.map((collaborator) =>
            createCollaboratorNotification(project.id, collaborator.user_id),
          ),
        );
      }

      resetForm();
      router.navigate('/(tabs)/profile');
    } catch (err: unknown) {
      if (createdProjectId) {
        try {
          await deleteProject(createdProjectId);
        } catch (cleanupError) {
          console.error('Failed to roll back incomplete project creation:', cleanupError);
        }
      }
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [user, title, description, demoUrl, repoUrl, mediaItems, selectedTagIds, collaborators, resetForm, router]);

  // ---------- Render ----------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="New Project" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Media upload */}
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
              {/* Thumbnail strip for multi-media */}
              <View style={styles.mediaThumbs}>
                {mediaItems.slice(1).map((item, idx) => (
                  <View key={`media-${idx + 1}`} style={styles.thumbContainer}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.thumbImage}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.thumbRemove}
                      onPress={() => removeMedia(idx + 1)}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </Pressable>
                    {item.type === 'video' && (
                      <View style={styles.thumbVideoBadge}>
                        <Ionicons name="videocam" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                ))}
                {mediaItems.length < MAX_MEDIA && (
                  <Pressable style={styles.addMoreBtn} onPress={pickMedia}>
                    <Ionicons name="add" size={24} color={colors.text.tertiary} />
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>

        {/* Title */}
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

        {/* Description */}
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

        {/* Demo URL */}
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

        {/* Repository URL */}
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

        {/* Tags */}
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

        {/* Collaborators */}
        <View style={styles.field}>
          <Text style={styles.label}>Collaborators</Text>
          <TextInput
            style={styles.input}
            placeholder="Search people to tag..."
            placeholderTextColor={colors.text.tertiary}
            value={collabQuery}
            onChangeText={setCollabQuery}
          />

          {/* Search results dropdown */}
          {(searchResults.length > 0 || searching) && (
            <View style={styles.searchDropdown}>
              {searching && searchResults.length === 0 ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
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

          {/* Selected collaborators */}
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
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.postBtn, submitting && styles.postBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post Project</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
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
