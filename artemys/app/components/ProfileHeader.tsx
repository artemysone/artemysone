import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { formatCount } from '@/utils/format';
import type { ProfileWithStats } from '@/types/database';

type ProfileHeaderProps = {
  profile: ProfileWithStats | null;
  name: string;
  handle: string;
  bio: string;
  projectCount: number;
  followerCount: number;
  followingCount: number;
  actions?: ReactNode;
};

export function ProfileHeader({
  profile,
  name,
  handle,
  bio,
  projectCount,
  followerCount,
  followingCount,
  actions,
}: ProfileHeaderProps) {
  return (
    <>
      <View style={styles.container}>
        {/* Avatar + Stats row */}
        <View style={styles.topRow}>
          <Avatar uri={profile?.avatar_url} name={name} size="lg" showRing />
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{formatCount(projectCount)}</Text>
              <Text style={styles.statLabel}>projects</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{formatCount(followerCount)}</Text>
              <Text style={styles.statLabel}>followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{formatCount(followingCount)}</Text>
              <Text style={styles.statLabel}>following</Text>
            </View>
          </View>
        </View>

        {/* Name + Bio */}
        <Text style={styles.name}>{name}</Text>
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      </View>

      {/* Action buttons */}
      {actions ? <View style={styles.actions}>{actions}</View> : null}

      <View style={styles.divider} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNum: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.text.primary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.primary,
    marginTop: 2,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 19,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
