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
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '@/services/notifications';
import { updateCollaboratorStatus } from '@/services/collaborators';
import { NotificationItem } from '@/components/NotificationItem';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import type { NotificationWithActor } from '@/types/database';

const PAGE_SIZE = 20;

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const patchNotification = useCallback(
    (notificationId: string, patch: Partial<NotificationWithActor>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const load = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (!user) return;
      try {
        const data = await getNotifications(user.id, pageNum);
        if (data.length < PAGE_SIZE) setHasMore(false);
        setItems((prev) => (replace ? data : [...prev, ...data]));
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    },
    [user],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load(0, true);
      setLoading(false);
    })();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await load(0, true);
    setRefreshing(false);
  }, [load]);

  const handleEndReached = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await load(nextPage, false);
    setPage(nextPage);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, load]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await markAllAsRead(user.id);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [user]);

  const handlePress = useCallback(
    async (notification: NotificationWithActor) => {
      if (!notification.read) {
        markAsRead(notification.id).catch(() => {});
        patchNotification(notification.id, { read: true });
      }

      if (notification.type === 'follow') {
        router.push({ pathname: '/user/[id]', params: { id: notification.actor_id } });
      } else if (notification.project_id) {
        router.push({ pathname: '/project/[id]', params: { id: notification.project_id } });
      }
    },
    [patchNotification, router],
  );

  const handleCollaboratorDecision = useCallback(
    async (notification: NotificationWithActor, status: 'accepted' | 'rejected') => {
      if (!user || !notification.project_id) return;

      try {
        await updateCollaboratorStatus(notification.project_id, user.id, status);
        if (!notification.read) {
          await markAsRead(notification.id).catch(() => {});
        }

        patchNotification(notification.id, { read: true, collaborator_status: status });
      } catch (err) {
        console.error(`Failed to ${status} collaborator invite:`, err);
      }
    },
    [patchNotification, user],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationWithActor }) => (
      <NotificationItem
        notification={item}
        onPress={() => handlePress(item)}
        onAcceptCollaborator={() => handleCollaboratorDecision(item, 'accepted')}
        onRejectCollaborator={() => handleCollaboratorDecision(item, 'rejected')}
      />
    ),
    [handleCollaboratorDecision, handlePress],
  );

  const keyExtractor = useCallback((item: NotificationWithActor) => item.id, []);

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
        <Text style={styles.emptyTitle}>No notifications yet</Text>
        <Text style={styles.emptyBody}>
          When someone likes your project, follows you, or tags you as a collaborator, it'll
          show up here.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={handleMarkAllRead}>
          <Text style={styles.markAllRead}>Mark all read</Text>
        </Pressable>
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  markAllRead: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
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
});
