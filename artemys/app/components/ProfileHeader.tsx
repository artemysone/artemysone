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
        <View style={styles.eyebrowPill}>
          <Text style={styles.eyebrowText}>Showcase</Text>
        </View>
        <Avatar uri={profile?.avatar_url} name={name} size="lg" showRing />
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

      {actions ? <View style={styles.profileActions}>{actions}</View> : null}

      {showProjectsHeader && projectCount > 0 ? (
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>Showcase</Text>
          <Text style={styles.gridCount}>
            {projectCount} {projectCount === 1 ? 'project' : 'projects'}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  eyebrowPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    marginBottom: spacing.md,
  },
  eyebrowText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    marginBottom: spacing.sm,
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
});
