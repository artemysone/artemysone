import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/services/profiles';
import { getUserProjects } from '@/services/projects';
import { toggleFollow, getFollowStatus } from '@/services/feed';
import { ProjectThumb, THUMB_GAP, thumbStyles } from '@/components/ProjectThumb';
import { ErrorState } from '@/components/ErrorState';
import { ProfileHeader } from '@/components/ProfileHeader';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { shareProfile } from '@/utils/share';
import type { ProfileWithStats, Project } from '@/types/database';

function EmptyProjects({ name }: { name: string }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cube-outline" size={40} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>No projects yet</Text>
      <Text style={styles.emptySubtitle}>
        {name} hasn't shared any projects yet. Check back later!
      </Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = (screenWidth - THUMB_GAP * 4) / 3;

  const [profileData, setProfileData] = useState<ProfileWithStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState(false);

  // If viewing own profile, redirect to tabs profile
  useEffect(() => {
    if (user && id === user.id) {
      router.replace('/(tabs)/profile');
    }
  }, [user, id, router]);

  const fetchData = useCallback(async () => {
    if (!id || id === user?.id) return;
    setError(false);
    try {
      const [prof, projs, followStatus] = await Promise.all([
        getProfile(id),
        getUserProjects(id),
        user ? getFollowStatus(user.id, id) : Promise.resolve(false),
      ]);
      setProfileData(prof);
      setProjects(projs);
      setIsFollowing(followStatus);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError(true);
    }
  }, [id, user]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchData().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleFollow = useCallback(() => {
    if (!user || !id) return;

    setIsFollowing((prev) => !prev);

    toggleFollow(user.id, id).catch(() => {
      setIsFollowing((prev) => !prev);
    });
  }, [user, id]);

  const handleProjectPress = useCallback(
    (projectId: string) => {
      router.push(`/project/${projectId}`);
    },
    [router],
  );

  const handleShareProfile = useCallback(() => {
    if (profileData) shareProfile(profileData.name, profileData.handle);
  }, [profileData]);

  const name = profileData?.name ?? 'Builder';
  const handle = profileData?.handle ? `@${profileData.handle}` : '';
  const bio = profileData?.bio ?? '';
  const projectCount = profileData?.project_count ?? 0;
  const followerCount = profileData?.follower_count ?? 0;
  const followingCount = profileData?.following_count ?? 0;

  const listHeader = useMemo(() => (
    <>
      <ProfileHeader
        profile={profileData}
        name={name}
        handle={handle}
        bio={bio}
        projectCount={projectCount}
        followerCount={followerCount}
        followingCount={followingCount}
        showProjectsHeader={projects.length > 0}
        actions={(
          <>
            <Pressable
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={handleFollow}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={handleShareProfile}>
              <Ionicons name="share-outline" size={16} color={colors.text.primary} />
            </Pressable>
          </>
        )}
      />
    </>
  ), [profileData, name, handle, bio, projectCount, followerCount, followingCount, projects.length, isFollowing, handleFollow, handleShareProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Profile</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Profile</Text>
          <View style={styles.headerRight} />
        </View>
        <ErrorState onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
        <View style={styles.headerRight} />
      </View>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <ProjectThumb
            project={item}
            thumbSize={thumbSize}
            onPress={() => handleProjectPress(item.id)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyProjects name={name} />}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={thumbStyles.gridRow}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // Custom header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerRight: {
    width: 36,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Actions
  followBtn: {
    flex: 1,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  followBtnActive: {
    borderColor: 'transparent',
    backgroundColor: colors.accentSoft,
  },
  followBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
  followBtnTextActive: {
    color: colors.accent,
  },
  shareBtn: {
    padding: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    paddingBottom: spacing.lg,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 260,
  },
});
