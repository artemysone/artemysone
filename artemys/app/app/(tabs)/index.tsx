import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getFeed, getDiscoverFeed, toggleLike, toggleFollow } from '@/services/feed';
import { AppBar } from '@/components/AppBar';
import { ProjectCard } from '@/components/ProjectCard';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { FeedItem } from '@/types/database';

export default function FeedScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isDiscover, setIsDiscover] = useState(false);
  const [error, setError] = useState(false);

  const loadFeed = useCallback(
    async (pageNum: number, replace: boolean, discoverMode?: boolean) => {
      if (!user) return;
      setError(false);
      const useDiscover = discoverMode ?? isDiscover;
      try {
        let data: FeedItem[];

        if (pageNum === 0 && !useDiscover) {
          data = await getFeed(user.id, 0);
          if (data.length === 0) {
            data = await getDiscoverFeed(user.id, 0);
            setIsDiscover(true);
          }
        } else {
          const fetcher = useDiscover ? getDiscoverFeed : getFeed;
          data = await fetcher(user.id, pageNum);
        }

        if (data.length < 10) setHasMore(false);

        setItems((prev) => (replace ? data : [...prev, ...data]));
      } catch (err) {
        console.error('Failed to load feed:', err);
        setError(true);
      }
    },
    [user, isDiscover],
  );

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadFeed(0, true);
      setLoading(false);
    })();
  }, [loadFeed]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    setPage(0);
    setHasMore(true);
    setIsDiscover(false);
    await loadFeed(0, true, false);
    setRefreshing(false);
  }, [loadFeed]);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    await loadFeed(0, true);
    setLoading(false);
  }, [loadFeed]);

  // Infinite scroll
  const handleEndReached = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadFeed(nextPage, false);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, loadFeed]);

  // Optimistic like
  const handleLike = useCallback(
    (projectId: string) => {
      if (!user) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === projectId
            ? {
                ...item,
                user_has_liked: !item.user_has_liked,
                like_count: item.user_has_liked
                  ? item.like_count - 1
                  : item.like_count + 1,
              }
            : item,
        ),
      );

      // Fire and forget — revert on error
      toggleLike(user.id, projectId).catch(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === projectId
              ? {
                  ...item,
                  user_has_liked: !item.user_has_liked,
                  like_count: item.user_has_liked
                    ? item.like_count - 1
                    : item.like_count + 1,
                }
              : item,
          ),
        );
      });
    },
    [user],
  );

  // Optimistic follow
  const handleFollow = useCallback(
    (authorId: string) => {
      if (!user) return;

      // Optimistic: toggle all items by this author
      setItems((prev) =>
        prev.map((item) =>
          item.profiles.id === authorId
            ? { ...item, user_is_following: !item.user_is_following }
            : item,
        ),
      );

      toggleFollow(user.id, authorId).catch(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.profiles.id === authorId
              ? { ...item, user_is_following: !item.user_is_following }
              : item,
          ),
        );
      });
    },
    [user],
  );

  // ---------- Render helpers ----------

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <ProjectCard
        project={item}
        isFollowing={item.user_is_following}
        onLike={() => handleLike(item.id)}
        onFollow={() => handleFollow(item.profiles.id)}
        onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}
        onAuthorPress={() => router.push({ pathname: '/user/[id]', params: { id: item.profiles.id } })}
      />
    ),
    [handleLike, handleFollow, router],
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyBody}>
          Follow some builders or check back later — new projects show up here.
        </Text>
      </View>
    );
  }, [loading]);

  if (error && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppBar title="Feed" />
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>Check your connection and try again.</Text>
          <Pressable style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppBar title="Feed" />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  empty: {
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  errorTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  errorBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  retryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent,
  },
});
