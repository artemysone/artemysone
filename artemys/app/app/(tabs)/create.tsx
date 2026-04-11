import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  createProject,
  deleteProject,
  uploadProjectMedia,
  cleanupUploadedProjectMedia,
} from '@/services/projects';
import { addProjectMedia } from '@/services/projectMedia';
import { createCollaboratorNotification } from '@/services/notifications';
import { AppBar } from '@/components/AppBar';
import {
  ProjectForm,
  type ProjectFormSubmission,
} from '@/components/ProjectForm';
import { colors } from '@/constants/Colors';
import type { UploadedProjectMediaAsset } from '@/services/projects';

export default function CreateScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = useCallback(
    async (values: ProjectFormSubmission) => {
      if (!user) {
        throw new Error('Your account is still loading. Try posting again in a moment.');
      }

      const uploadedAssets: UploadedProjectMediaAsset[] = [];
      let createdProjectId: string | null = null;

      try {
        const project = await createProject({
          title: values.title,
          description: values.description,
          media_format: values.projectFormat,
          demo_url: values.demoUrl || undefined,
          repo_url: values.repoUrl || undefined,
          tech_stack: values.techStack,
          tag_ids: values.selectedTagIds,
          collaborators: values.collaborators.map((c) => ({
            user_id: c.user_id,
            role: c.role,
          })),
        });
        createdProjectId = project.id;

        const primary = values.mediaItems[0];
        const primaryUpload = await uploadProjectMedia(
          user.id,
          project.id,
          primary.uri,
          primary.type,
          { storageKey: 'primary', updateProject: true },
        );
        uploadedAssets.push(primaryUpload);

        const uploadResults: Array<{
          mediaUrl: string;
          mediaType: 'image' | 'video';
          thumbnailUrl?: string;
          sortOrder: number;
        }> = [];
        for (const [index, item] of values.mediaItems.slice(1).entries()) {
          const result = await uploadProjectMedia(user.id, project.id, item.uri, item.type, {
            storageKey: `media-${index + 1}`,
            updateProject: false,
          });

          uploadedAssets.push(result);
          uploadResults.push({
            mediaUrl: result.mediaUrl,
            mediaType: item.type,
            thumbnailUrl: result.thumbnailUrl,
            sortOrder: index + 1,
          });
        }

        await addProjectMedia(project.id, [
          {
            mediaUrl: primaryUpload.mediaUrl,
            mediaType: primary.type,
            thumbnailUrl: primaryUpload.thumbnailUrl,
            sortOrder: 0,
          },
          ...uploadResults,
        ]);

        if (values.collaborators.length > 0) {
          await Promise.allSettled(
            values.collaborators.map((collaborator) =>
              createCollaboratorNotification(project.id, collaborator.user_id),
            ),
          );
        }

        router.navigate('/(tabs)/profile');
      } catch (err: unknown) {
        await cleanupUploadedProjectMedia(uploadedAssets).catch(() => {});
        if (createdProjectId) {
          try {
            await deleteProject(createdProjectId);
          } catch (cleanupError) {
            console.error('Failed to roll back incomplete project creation:', cleanupError);
          }
        }
        throw err instanceof Error ? err : new Error('Something went wrong. Try again.');
      }
    },
    [router, user],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="artemys" />
      <ProjectForm submitLabel="Post Project" onSubmit={handleSubmit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
