import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

const PROJECTS = [
  { name: 'Spatial Notes', gradient: ['#F4845F', '#F7B267'] as const },
  { name: 'Wavelength', gradient: ['#7B2FBE', '#4A90D9'] as const },
  { name: 'Carbon Tracker', gradient: ['#2D936C', '#47B5A0'] as const },
  { name: 'Type Studio', gradient: ['#E07A5F', '#F2CC8F'] as const },
  { name: 'Mood Board AI', gradient: ['#D84797', '#F09ABC'] as const },
  { name: 'Transit', gradient: ['#3D5A80', '#98C1D9'] as const },
  { name: 'Pocket Chef', gradient: ['#CB4B16', '#F5A623'] as const },
  { name: 'Study Circles', gradient: ['#7C6AEF', '#C084FC'] as const },
  { name: 'Drift', gradient: ['#0F766E', '#5EEAD4'] as const },
];

function ProjectThumb({ project }: { project: (typeof PROJECTS)[0] }) {
  return (
    <Pressable style={styles.thumb}>
      <LinearGradient colors={project.gradient} style={styles.thumbGradient}>
        <View style={styles.thumbUI}>
          <View style={styles.thumbLine} />
          <View style={[styles.thumbLine, { width: '45%' }]} />
          <View style={styles.thumbCircle} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>artemys</Text>
        <Pressable>
          <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <LinearGradient colors={[colors.accent, colors.gold]} style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>MC</Text>
            </View>
          </LinearGradient>
          <Text style={styles.profileName}>Maya Chen</Text>
          <Text style={styles.profileHandle}>@mayachen</Text>
          <Text style={styles.profileBio}>
            Building at the intersection of design & code. CS @ Stanford '25.
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>9</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>34</Text>
              <Text style={styles.statLabel}>Collaborators</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>8.2K</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.profileActions}>
          <Pressable style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
          <Pressable style={styles.shareBtn}>
            <Ionicons name="share-outline" size={16} color={colors.text.primary} />
          </Pressable>
        </View>

        {/* Grid header */}
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>Projects</Text>
          <Text style={styles.gridCount}>9 projects</Text>
        </View>

        {/* Project grid */}
        <View style={styles.grid}>
          {PROJECTS.map((project) => (
            <ProjectThumb key={project.name} project={project} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
  },
  appBarTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text.primary,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
  },
  avatar: {
    flex: 1,
    borderRadius: 44,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.accent,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingHorizontal: 2,
    paddingBottom: spacing.lg,
  },
  thumb: {
    width: '33%',
    flexGrow: 1,
    flexBasis: '33%',
    maxWidth: '33.33%',
    aspectRatio: 1,
    padding: 1,
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
});
