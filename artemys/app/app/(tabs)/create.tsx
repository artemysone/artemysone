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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { createProject, uploadProjectMedia } from '@/services/projects';
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
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
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

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      videoMaxDuration: 30,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setMediaUri(asset.uri);
    // Detect type: if duration exists and is > 0, it's a video
    setMediaType(asset.type === 'video' || (asset.duration != null && asset.duration > 0) ? 'video' : 'image');
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

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setMediaUri(null);
    setMediaType('image');
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
    if (!mediaUri) {
      Alert.alert('Missing media', 'Add a demo video or screenshot.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create project record
      const project = await createProject(user.id, {
        title: title.trim(),
        description: description.trim(),
        tag_ids: selectedTagIds,
        collaborators: collaborators.map((c) => ({
          user_id: c.user_id,
          role: c.role,
        })),
      });

      // 2. Upload media
      await uploadProjectMedia(user.id, project.id, mediaUri, mediaType);

      // 3. Done — reset and go to profile
      resetForm();
      router.navigate('/(tabs)/profile');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user, title, description, mediaUri, mediaType, selectedTagIds, collaborators, resetForm, router]);

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
          <MediaUploadArea
            onPress={pickMedia}
            selectedUri={mediaUri}
            mediaType={mediaType}
          />
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
