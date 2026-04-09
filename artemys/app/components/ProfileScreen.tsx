import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileData } from '@/hooks/useProfileData';
import { toggleFollow, getFollowStatus } from '@/services/feed';
import { ProfileView } from '@/components/ProfileView';
import { AppBar } from '@/components/AppBar';
import { shareProfileWithLink } from '@/utils/share';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

function EmptyProjectsOwn() {
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

function EmptyProjectsOther({ name }: { name: string }) {
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

type ProfileScreenProps =
  | { handle: string; isTab?: false }
  | { handle?: undefined; isTab: true };

export function ProfileScreen(props: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const isTab = props.isTab ?? false;

  // Tab uses current user's ID; navigated uses handle
  const lookup = isTab
    ? { userId: user!.id }
    : { handle: props.handle };

  const {
    profileData, projects, loading, setLoading,
    refreshing, error, fetchData, refresh,
  } = useProfileData(lookup);
  const [isFollowing, setIsFollowing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const isOwnProfile = !!user && !!profileData && profileData.id === user.id;

  // Refetch on focus — handles both initial load and returning from profile-edit
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
    }, [fetchData, setLoading]),
  );

  // Fetch follow status once we have profile data (non-tab, not own profile)
  useEffect(() => {
    if (isTab || !profileData || !user || profileData.id === user.id) return;
    getFollowStatus(user.id, profileData.id).then(setIsFollowing).catch(() => {});
  }, [isTab, profileData, user]);

  const handleFollow = useCallback(() => {
    if (!user || !profileData) return;
    setIsFollowing((prev) => !prev);
    toggleFollow(user.id, profileData.id).catch(() => {
      setIsFollowing((prev) => !prev);
    });
  }, [user, profileData]);

  const handleShare = useCallback(() => {
    if (profileData) shareProfileWithLink(profileData.name, profileData.handle);
  }, [profileData]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }, [signOut]);

  const name = profileData?.name ?? 'Builder';

  const ownActions = (
    <>
      <Pressable style={styles.pillBtn} onPress={() => router.push('/profile-edit')}>
        <Text style={styles.pillBtnText}>Edit profile</Text>
      </Pressable>
      <Pressable style={styles.pillBtn} onPress={handleShare}>
        <Text style={styles.pillBtnText}>Share profile</Text>
      </Pressable>
    </>
  );

  const otherActions = (
    <>
      <Pressable
        style={[styles.pillBtn, !isFollowing && styles.pillBtnAccent]}
        onPress={handleFollow}
      >
        <Text style={[styles.pillBtnText, !isFollowing && styles.pillBtnAccentText]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
      <Pressable style={styles.pillBtn} onPress={handleShare}>
        <Text style={styles.pillBtnText}>Share</Text>
      </Pressable>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar
        title="artemys"
        leftIcon={!isTab ? 'arrow-back' : undefined}
        onLeftPress={!isTab ? () => router.back() : undefined}
        rightIcon={isOwnProfile ? 'settings-outline' : undefined}
        onRightPress={isOwnProfile ? () => setMenuVisible(true) : undefined}
      />

      {isOwnProfile && (
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
            <View style={styles.menuCard}>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  handleSignOut();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#D44" />
                <Text style={[styles.menuItemText, { color: '#D44' }]}>Sign Out</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      <ProfileView
        profileData={profileData}
        projects={projects}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={refresh}
        onRetry={fetchData}
        onProjectPress={(id) => router.push({ pathname: '/project/[id]', params: { id } })}
        emptyComponent={isOwnProfile ? <EmptyProjectsOwn /> : <EmptyProjectsOther name={name} />}
        actions={isOwnProfile ? ownActions : otherActions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: spacing.lg,
  },
  menuCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  menuItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.sm,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  pillBtnAccent: {
    backgroundColor: colors.accent,
  },
  pillBtnAccentText: {
    color: '#fff',
  },
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
