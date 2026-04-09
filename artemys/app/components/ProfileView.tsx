import { ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { ProfileHeader } from './ProfileHeader';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProjectThumb, THUMB_GAP, thumbStyles } from './ProjectThumb';
import { ErrorState } from './ErrorState';
import { colors, spacing } from '@/constants/Colors';
import type { ProfileWithStats, Project } from '@/types/database';

type ProfileViewProps = {
  profileData: ProfileWithStats | null;
  projects: Project[];
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onProjectPress: (projectId: string) => void;
  actions: ReactNode;
  emptyComponent: ReactNode;
};

export function ProfileView({
  profileData,
  projects,
  loading,
  refreshing,
  error,
  onRefresh,
  onRetry,
  onProjectPress,
  actions,
  emptyComponent,
}: ProfileViewProps) {
  const { width } = useWindowDimensions();
  const thumbSize = (width - THUMB_GAP * 4) / 3;

  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorState onRetry={onRetry} />;

  return (
    <FlatList
      data={projects}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => (
        <ProjectThumb
          project={item}
          thumbSize={thumbSize}
          onPress={() => onProjectPress(item.id)}
        />
      )}
      ListHeaderComponent={
        <ProfileHeader
          profile={profileData}
          name={profileData?.name ?? 'Builder'}
          handle={profileData?.handle ? `@${profileData.handle}` : ''}
          bio={profileData?.bio ?? ''}
          projectCount={profileData?.project_count ?? 0}
          followerCount={profileData?.follower_count ?? 0}
          followingCount={profileData?.following_count ?? 0}
          actions={actions}
        />
      }
      ListEmptyComponent={<>{emptyComponent}</>}
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={thumbStyles.gridRow}
      contentContainerStyle={styles.grid}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingBottom: spacing.lg,
  },
});
