import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/services/profiles';
import { getUserProjects } from '@/services/projects';
import { AppBar } from '@/components/AppBar';
import { ProjectThumb, THUMB_GAP, thumbStyles } from '@/components/ProjectThumb';
import { ErrorState } from '@/components/ErrorState';
import { ProfileHeader } from '@/components/ProfileHeader';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { shareProfile } from '@/utils/share';
import type { ProfileWithStats, Project } from '@/types/database';

function EmptyProjects() {
  const router = useRouter();
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cube-outline" size={40} color={colors.text.tertiary} />
      </View>
      <Text style={styles.emptyTitle}>Share your first project</Text>
      <Text style={styles.emptySubtitle}>
        Show what you've been building — add a project to get started.
      </Text>
      <Pressable style={styles.emptyButton} onPress={() => router.push('/create')}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.emptyButtonText}>New Project</Text>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = (screenWidth - THUMB_GAP * 4) / 3;

  const [profileData, setProfileData] = useState<ProfileWithStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError(false);
    try {
      const [prof, projs] = await Promise.all([
        getProfile(user.id),
        getUserProjects(user.id),
      ]);
      setProfileData(prof);
      setProjects(projs);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(true);
    }
  }, [user]);

  const hasLoadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (!hasLoadedOnce.current) setLoading(true);
      fetchData().finally(() => {
        if (mounted) {
          setLoading(false);
          hasLoadedOnce.current = true;
        }
      });
      return () => { mounted = false; };
    }, [fetchData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  }, [signOut]);

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
            <Pressable style={styles.editBtn} onPress={() => router.push('/profile-edit')}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={handleShareProfile}>
              <Ionicons name="share-outline" size={16} color={colors.text.primary} />
            </Pressable>
          </>
        )}
      />
    </>
  ), [profileData, name, handle, bio, projectCount, followerCount, followingCount, projects.length, router, handleShareProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppBar title="artemys" rightIcon="settings-outline" onRightPress={handleSignOut} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppBar title="artemys" rightIcon="settings-outline" onRightPress={handleSignOut} />
        <ErrorState onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="artemys" rightIcon="settings-outline" onRightPress={handleSignOut} />
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <ProjectThumb
            project={item}
            thumbSize={thumbSize}
            onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={EmptyProjects}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flex: 1,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  editBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text.primary,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  emptyButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: '#fff',
  },
});
