import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  showProjectsHeader?: boolean;
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
  showProjectsHeader = true,
}: ProfileHeaderProps) {
  return (
    <>
      <View style={styles.profileHeader}>
        <View style={styles.topRow}>
          <Avatar uri={profile?.avatar_url} name={name} size="lg" showRing />
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
        <Text style={styles.profileName}>{name}</Text>
        {handle ? <Text style={styles.profileHandle}>{handle}</Text> : null}
        {bio ? <Text style={styles.profileBio}>{bio}</Text> : null}
      </View>

      {actions ? <View style={styles.profileActions}>{actions}</View> : null}

      {showProjectsHeader && projectCount > 0 ? (
        <View style={styles.gridHeader} accessibilityRole="tablist">
          <View style={styles.gridTab}>
            <Ionicons name="grid-outline" size={18} color={colors.text.primary} />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  profileHandle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 3,
  },
  profileBio: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'left',
    lineHeight: 21,
    marginTop: 10,
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
    marginBottom: spacing.md,
  },
  gridHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.sm,
    marginBottom: 2,
    paddingVertical: 10,
  },
  gridTab: {
    paddingHorizontal: spacing.lg,
  },
});
