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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/services/profiles';
import { getUserProjects } from '@/services/projects';
import { Avatar } from '@/components/Avatar';
import { AppBar } from '@/components/AppBar';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { formatCount } from '@/utils/format';
import type { ProfileWithStats, Project } from '@/types/database';

const THUMB_GAP = 2;

// Deterministic gradient from project id
const GRADIENTS: readonly [string, string][] = [
  ['#F4845F', '#F7B267'],
  ['#7B2FBE', '#4A90D9'],
  ['#2D936C', '#47B5A0'],
  ['#E07A5F', '#F2CC8F'],
  ['#D84797', '#F09ABC'],
  ['#3D5A80', '#98C1D9'],
  ['#CB4B16', '#F5A623'],
  ['#7C6AEF', '#C084FC'],
  ['#0F766E', '#5EEAD4'],
];

function getGradient(id: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function ProjectThumb({ project, thumbSize }: { project: Project; thumbSize: number }) {
  const hasThumbnail = project.thumbnail_url || project.media_url;
  const imageUri = project.thumbnail_url ?? project.media_url;

  if (hasThumbnail && imageUri) {
    return (
      <Pressable style={[styles.thumb, { maxWidth: thumbSize }]}>
        <Image
          source={{ uri: imageUri }}
          style={styles.thumbImage}
          contentFit="cover"
          transition={200}
        />
      </Pressable>
    );
  }

  const grad = getGradient(project.id);
  return (
    <Pressable style={[styles.thumb, { maxWidth: thumbSize }]}>
      <LinearGradient colors={grad as [string, string]} style={styles.thumbGradient}>
        <View style={styles.thumbUI}>
          <View style={styles.thumbLine} />
          <View style={[styles.thumbLine, { width: '45%' }]} />
          <View style={styles.thumbCircle} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

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

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [prof, projs] = await Promise.all([
        getProfile(user.id),
        getUserProjects(user.id),
      ]);
      setProfileData(prof);
      setProjects(projs);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, [user]);

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

  const name = profileData?.name ?? 'Builder';
  const handle = profileData?.handle ? `@${profileData.handle}` : '';
  const bio = profileData?.bio ?? '';
  const projectCount = profileData?.project_count ?? 0;
  const followerCount = profileData?.follower_count ?? 0;
  const followingCount = profileData?.following_count ?? 0;

  const listHeader = useMemo(() => (
    <>
      <View style={styles.profileHeader}>
        <Avatar uri={profileData?.avatar_url} name={name} size="lg" showRing />
        <Text style={styles.profileName}>{name}</Text>
        {handle ? <Text style={styles.profileHandle}>{handle}</Text> : null}
        {bio ? <Text style={styles.profileBio}>{bio}</Text> : null}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatCount(projectCount)}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatCount(followerCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatCount(followingCount)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>
      <View style={styles.profileActions}>
        <Pressable style={styles.editBtn} onPress={() => router.push('/profile-edit' as any)}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </Pressable>
        <Pressable style={styles.shareBtn}>
          <Ionicons name="share-outline" size={16} color={colors.text.primary} />
        </Pressable>
      </View>
      {projects.length > 0 && (
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>Projects</Text>
          <Text style={styles.gridCount}>
            {projectCount} {projectCount === 1 ? 'project' : 'projects'}
          </Text>
        </View>
      )}
    </>
  ), [profileData, name, handle, bio, projectCount, followerCount, followingCount, projects.length, router]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="artemys" rightIcon="settings-outline" onRightPress={handleSignOut} />
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => <ProjectThumb project={item} thumbSize={thumbSize} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={EmptyProjects}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.gridRow}
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
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  profileName: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text.primary,
    marginTop: 12,
  },
  profileHandle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  profileBio: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 280,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 18,
    paddingBottom: 18,
  },
  stat: {
    alignItems: 'center',
  },
  statNum: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
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
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 12,
  },
  gridTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.text.primary,
  },
  gridCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
  },
  gridContainer: {
    paddingBottom: spacing.lg,
  },
  gridRow: {
    gap: THUMB_GAP,
    paddingHorizontal: THUMB_GAP,
  },
  thumb: {
    flex: 1,
    aspectRatio: 1,
  },
  thumbImage: {
    flex: 1,
    borderRadius: 2,
  },
  thumbGradient: {
    flex: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbUI: {
    width: '60%',
    gap: 6,
    alignItems: 'flex-start',
  },
  thumbLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    width: '70%',
  },
  thumbCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 4,
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
