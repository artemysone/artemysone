import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/AppBar';
import {
  ProjectForm,
  type ProjectFormInitialValues,
  type ProjectFormSubmission,
} from '@/components/ProjectForm';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectMedia, replaceProjectMedia } from '@/services/projectMedia';
import {
  getProject,
  cleanupUploadedProjectMedia,
  updateProject,
  uploadProjectMedia,
  type UploadedProjectMediaAsset,
} from '@/services/projects';
import type { ProjectMedia, ProjectWithDetails } from '@/types/database';
import { replaceProjectTags } from '@/services/tags';
import { colors, spacing } from '@/constants/Colors';

type LoadedProjectState = {
  project: ProjectWithDetails;
  media: ProjectMedia[];
};

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<LoadedProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [project, media] = await Promise.all([
          getProject(id, user?.id),
          getProjectMedia(id),
        ]);

        if (!project) {
          throw new Error('Project not found.');
        }

        if (!user || project.user_id !== user.id) {
          if (!cancelled) {
            router.replace({ pathname: '/project/[id]', params: { id: project.id } });
          }
          return;
        }

        if (!cancelled) {
          setState({ project, media });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load the project.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const initialValues = useMemo<ProjectFormInitialValues | undefined>(() => {
    if (!state) return undefined;

    return {
      projectFormat: state.project.media_format,
      title: state.project.title,
      description: state.project.description,
      demoUrl: state.project.demo_url ?? '',
      repoUrl: state.project.repo_url ?? '',
      techStack: state.project.tech_stack ?? [],
      mediaItems: state.media.map((item) => ({
        uri: item.media_url,
        type: item.media_type,
        source: 'remote',
      })),
      selectedTagIds: state.project.project_tags.map((item) => item.tags.id),
      collaborators: state.project.collaborators
        .filter((collab) => collab.status !== 'rejected')
        .map((collab) => ({
          user_id: collab.user_id,
          name: collab.profiles.name,
          handle: collab.profiles.handle,
          avatar_url: collab.profiles.avatar_url,
          role: collab.role,
        })),
    };
  }, [state]);

  const handleSubmit = useCallback(
    async (values: ProjectFormSubmission) => {
      if (!user) {
        throw new Error('Your account is still loading. Try again in a moment.');
      }
      if (!id || !state) {
        throw new Error('Project is still loading.');
      }
      if (state.project.user_id !== user.id) {
        throw new Error('Only the project owner can edit this project.');
      }

      const uploadedAssets: UploadedProjectMediaAsset[] = [];

      try {
        const mediaChanged =
          values.mediaItems.length !== state.media.length ||
          values.mediaItems.some((item, index) => {
            const existing = state.media[index];
            if (!existing) return true;
            return item.source === 'local'
              || existing.media_url !== item.uri
              || existing.media_type !== item.type;
          });
        const tagsChanged =
          values.selectedTagIds.length !== state.project.project_tags.length
          || values.selectedTagIds.some(
            (tagId) => !state.project.project_tags.some((item) => item.tags.id === tagId),
          );

        const resolvedMedia: Array<{
          mediaUrl: string;
          mediaType: 'image' | 'video';
          thumbnailUrl?: string;
          sortOrder: number;
        }> = [];
        if (mediaChanged) {
          for (const [index, item] of values.mediaItems.entries()) {
            if (item.source !== 'local') {
              const existing = state.media.find((media) => media.media_url === item.uri);
              if (!existing) {
                throw new Error('Could not match existing project media.');
              }

              resolvedMedia.push({
                mediaUrl: existing.media_url,
                mediaType: existing.media_type,
                thumbnailUrl: existing.thumbnail_url ?? undefined,
                sortOrder: index,
              });
              continue;
            }

            const upload = await uploadProjectMedia(user.id, state.project.id, item.uri, item.type, {
              storageKey: index === 0 ? 'primary' : `media-${index}`,
              updateProject: false,
            });
            uploadedAssets.push(upload);
            resolvedMedia.push({
              mediaUrl: upload.mediaUrl,
              mediaType: item.type,
              thumbnailUrl: upload.thumbnailUrl,
              sortOrder: index,
            });
          }
        } else {
          resolvedMedia.push(
            ...state.media.map((item, index) => ({
              mediaUrl: item.media_url,
              mediaType: item.media_type,
              thumbnailUrl: item.thumbnail_url ?? undefined,
              sortOrder: index,
            })),
          );
        }

        const primaryMedia = resolvedMedia[0];
        await updateProject(state.project.id, {
          title: values.title,
          description: values.description,
          media_url: primaryMedia?.mediaUrl ?? null,
          media_type: primaryMedia?.mediaType ?? 'image',
          media_format: values.projectFormat,
          thumbnail_url: primaryMedia?.thumbnailUrl ?? null,
          demo_url: values.demoUrl,
          repo_url: values.repoUrl,
          tech_stack: values.techStack,
        });
        if (tagsChanged) {
          await replaceProjectTags(state.project.id, values.selectedTagIds);
        }
        if (mediaChanged) {
          await replaceProjectMedia(state.project.id, resolvedMedia);
        }

        router.replace({ pathname: '/project/[id]', params: { id: state.project.id } });
      } catch (err) {
        await cleanupUploadedProjectMedia(uploadedAssets).catch(() => {});
        throw err instanceof Error ? err : new Error('Could not save project changes.');
      }
    },
    [id, router, state, user],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="Edit project" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      {loading || !state || !initialValues ? (
        <View style={styles.centered}>
          {error ? (
            <Text style={styles.message}>{error}</Text>
          ) : (
            <ActivityIndicator size="large" color={colors.accent} />
          )}
        </View>
      ) : (
        <ProjectForm
          initialValues={initialValues}
          submitLabel="Save changes"
          allowCollaborators={false}
          collaboratorHelperText="Existing collaborators stay attached here, but collaborator edits are out of scope for this first pass."
          onSubmit={handleSubmit}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  message: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
});
