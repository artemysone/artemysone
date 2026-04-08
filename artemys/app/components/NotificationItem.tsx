import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from '@/components/Avatar';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { timeSince } from '@/utils/format';
import type { NotificationWithActor } from '@/types/database';

interface NotificationItemProps {
  notification: NotificationWithActor;
  onPress: () => void;
}

function getAction(type: NotificationWithActor['type']): string {
  switch (type) {
    case 'like':
      return ' liked your project';
    case 'follow':
      return ' started following you';
    case 'comment':
      return ' commented on your project';
    case 'collaborator':
      return ' tagged you as a collaborator';
  }
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { profiles: actor, projects } = notification;

  return (
    <Pressable
      style={[styles.container, !notification.read && styles.unread]}
      onPress={onPress}
    >
      <Avatar
        uri={actor.avatar_url}
        name={actor.name}
        size="sm"
      />
      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={2}>
          <Text style={styles.name}>{actor.name}</Text>
          {getAction(notification.type)}
        </Text>
        <Text style={styles.time}>{timeSince(notification.created_at)}</Text>
      </View>
      {projects?.thumbnail_url && (
        <Image
          source={{ uri: projects.thumbnail_url }}
          style={styles.thumbnail}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  unread: {
    backgroundColor: colors.accentSoft,
  },
  content: {
    flex: 1,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
});
