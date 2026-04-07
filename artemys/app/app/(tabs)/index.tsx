import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

const MOCK_POSTS = [
  {
    id: '1',
    user: { name: 'Jordan Rivera', handle: '@jordanr', initials: 'JR', gradient: ['#3D5A80', '#98C1D9'] as const },
    title: 'Halo',
    description: 'A minimal smart home dashboard that adapts its layout based on time of day and your routines.',
    tags: ['SwiftUI', 'HomeKit', 'iOS'],
    media: ['#1a1a2e', '#16213e', '#0f3460'] as const,
    likes: 234,
    comments: 18,
    collaborators: [
      { initials: 'AP', color: '#E07A5F' },
      { initials: 'LK', color: '#7C6AEF' },
      { initials: 'TN', color: '#2D936C' },
    ],
    time: '2h',
  },
  {
    id: '2',
    user: { name: 'Priya Sharma', handle: '@priyabuilds', initials: 'PS', gradient: ['#D84797', '#F09ABC'] as const },
    title: 'Bloom',
    description: 'Plant care companion that uses your phone camera to diagnose issues and track growth over time.',
    tags: ['React Native', 'TensorFlow', 'Mobile'],
    media: ['#264653', '#2a9d8f', '#e9c46a'] as const,
    likes: 412,
    comments: 31,
    collaborators: [
      { initials: 'AR', color: '#F4845F' },
      { initials: 'KW', color: '#3D5A80' },
    ],
    time: '5h',
  },
  {
    id: '3',
    user: { name: 'Marcus Kim', handle: '@marcuskim', initials: 'MK', gradient: ['#CB4B16', '#F5A623'] as const },
    title: 'Offset',
    description: 'A marketplace concept for micro carbon credits. Track, buy, and retire credits from verified reforestation projects.',
    tags: ['Next.js', 'Solidity', 'Design'],
    media: ['#0d1b2a', '#1b263b', '#415a77'] as const,
    likes: 89,
    comments: 7,
    collaborators: [
      { initials: 'SL', color: '#7B2FBE' },
      { initials: 'JT', color: '#E07A5F' },
      { initials: 'RH', color: '#0F766E' },
      { initials: 'NP', color: '#D84797' },
    ],
    time: '1d',
  },
];

function PostCard({ post }: { post: (typeof MOCK_POSTS)[0] }) {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <LinearGradient colors={post.user.gradient} style={styles.postAvatar}>
          <Text style={styles.avatarText}>{post.user.initials}</Text>
        </LinearGradient>
        <View style={styles.postUserInfo}>
          <Text style={styles.postUserName}>{post.user.name}</Text>
          <Text style={styles.postMeta}>{post.user.handle} · {post.time}</Text>
        </View>
        <Pressable style={styles.followBtn}>
          <Text style={styles.followBtnText}>Follow</Text>
        </Pressable>
      </View>

      <LinearGradient colors={post.media} style={styles.postMedia}>
        <View style={styles.playButton}>
          <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </LinearGradient>

      <View style={styles.postActions}>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="heart-outline" size={22} color={colors.text.primary} />
          <Text style={styles.actionText}>{post.likes}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.text.primary} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="share-outline" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      <View style={styles.postBody}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postDesc}>{post.description}</Text>
      </View>

      <View style={styles.postTags}>
        {post.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.collabRow}>
        <View style={styles.collabStack}>
          {post.collaborators.map((c, i) => (
            <View key={i} style={[styles.collabDot, { backgroundColor: c.color, marginLeft: i > 0 ? -6 : 0 }]}>
              <Text style={styles.collabDotText}>{c.initials}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.collabLabel}>{post.collaborators.length} collaborators</Text>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Feed</Text>
        <Pressable>
          <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
        </Pressable>
      </View>
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
      />
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
  postCard: {
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: '#fff',
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  postMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  followBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent,
  },
  postMedia: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.primary,
  },
  postBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  postTitle: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: 4,
  },
  postDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.input,
  },
  tagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text.secondary,
  },
  collabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  collabStack: {
    flexDirection: 'row',
  },
  collabDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collabDotText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#fff',
  },
  collabLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
