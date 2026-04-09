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
  onAcceptCollaborator?: () => void;
  onRejectCollaborator?: () => void;
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

export function NotificationItem({
  notification,
  onPress,
  onAcceptCollaborator,
  onRejectCollaborator,
}: NotificationItemProps) {
  const { profiles: actor, projects } = notification;
  const showCollaboratorActions =
    notification.type === 'collaborator' &&
    notification.collaborator_status === 'pending';

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
        {showCollaboratorActions && onAcceptCollaborator && onRejectCollaborator ? (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.rejectButton}
              onPress={(event) => {
                event.stopPropagation();
                onRejectCollaborator();
              }}
            >
              <Text style={styles.rejectButtonText}>Decline</Text>
            </Pressable>
            <Pressable
              style={styles.acceptButton}
              onPress={(event) => {
                event.stopPropagation();
                onAcceptCollaborator();
              }}
            >
              <Text style={styles.acceptButtonText}>Confirm</Text>
            </Pressable>
          </View>
        ) : null}
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rejectButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.input,
  },
  rejectButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text.secondary,
  },
  acceptButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  acceptButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: '#fff',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
});
